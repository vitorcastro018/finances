import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { verificarApiKey } from "@/lib/api/auth";
import { resolverCartaoPorNome } from "@/lib/api/cartoes";
import { resolverCategoriaPorNome, resolverSubcategoriaPorNome } from "@/lib/api/categorias";
import { lancamentoParaApi } from "@/lib/api/lancamentos";
import { semCamposVazios } from "@/lib/api/query-utils";
import { calcularDataFatura } from "@/lib/cartoes";
import { rangeDoMes } from "@/lib/data/lancamentos";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentMonthRef, monthRefToParam, todayInAppTimezone } from "@/lib/timezone";
import type { Database } from "@/lib/supabase/types";

const filtroApiSchema = z.preprocess(
  semCamposVazios,
  z.object({
    // "yyyy-mm" de um mês específico, ou "todos". Sem o parâmetro, cai no
    // mês atual — mesmo padrão de /lancamentos.
    mes: z
      .union([z.literal("todos"), z.string().regex(/^\d{4}-\d{2}$/, "mes inválido, use yyyy-mm ou 'todos'")])
      .default(() => monthRefToParam(currentMonthRef())),
    tipo: z.enum(["entrada", "saida"]).optional(),
    categoria: z.string().trim().min(1).optional(),
    // Exige 'categoria' junto — igual o formulário, a subcategoria só faz
    // sentido escolhida dentro de uma categoria de topo já escolhida.
    subcategoria: z.string().trim().min(1).optional(),
    cartao: z.string().trim().min(1).optional(),
    pago: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === "true")),
    busca: z.string().trim().max(120).optional(),
  }),
);

/** GET /api/lancamentos?mes=2026-09&tipo=saida&categoria=Lazer&subcategoria=Cinema&cartao=Nubank&pago=false&busca=uber
 * `data_prevista` de um lançamento no cartão é o vencimento da fatura, não o
 * dia da compra — mesmo comportamento de /lancamentos na tela. */
export async function GET(request: NextRequest) {
  const erroAuth = verificarApiKey(request);
  if (erroAuth) return erroAuth;

  const parsed = filtroApiSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const filtros = parsed.data;

  const admin = createAdminClient();

  let categoriaId: string | undefined;
  if (filtros.categoria) {
    if (!filtros.tipo) {
      return NextResponse.json({ error: "Informe também 'tipo' (entrada/saida) ao filtrar por categoria." }, { status: 400 });
    }
    const resolvida = await resolverCategoriaPorNome(admin, filtros.categoria, filtros.tipo);
    if ("erro" in resolvida) return NextResponse.json({ error: resolvida.erro }, { status: resolvida.status });
    categoriaId = resolvida.id;

    if (filtros.subcategoria) {
      const sub = await resolverSubcategoriaPorNome(admin, resolvida.id, resolvida.nome, filtros.subcategoria);
      if ("erro" in sub) return NextResponse.json({ error: sub.erro }, { status: sub.status });
      categoriaId = sub.id;
    }
  } else if (filtros.subcategoria) {
    return NextResponse.json({ error: "Informe também 'categoria' ao filtrar por subcategoria." }, { status: 400 });
  }

  let cartaoId: string | undefined;
  if (filtros.cartao) {
    const resolvido = await resolverCartaoPorNome(admin, filtros.cartao);
    if ("erro" in resolvido) return NextResponse.json({ error: resolvido.erro }, { status: resolvido.status });
    cartaoId = resolvido.id;
  }

  let query = admin.from("lancamentos").select("*").eq("user_id", env.APP_USER_ID!);
  const range = rangeDoMes(filtros.mes);
  if (range) query = query.gte("data_prevista", range.de).lte("data_prevista", range.ate);
  if (filtros.tipo) query = query.eq("tipo", filtros.tipo);
  if (categoriaId) query = query.eq("categoria_id", categoriaId);
  if (cartaoId) query = query.eq("cartao_id", cartaoId);
  if (filtros.pago !== undefined) query = query.eq("pago", filtros.pago);
  if (filtros.busca) query = query.ilike("nome", `%${filtros.busca}%`);

  const { data, error } = await query.order("data_prevista", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const [{ data: categorias }, { data: cartoes }] = await Promise.all([
    admin.from("categorias").select("id, nome").eq("user_id", env.APP_USER_ID!),
    admin.from("cartoes").select("id, nome").eq("user_id", env.APP_USER_ID!),
  ]);
  const nomeCategoriaPorId = new Map((categorias ?? []).map((c) => [c.id, c.nome]));
  const nomeCartaoPorId = new Map((cartoes ?? []).map((c) => [c.id, c.nome]));

  return NextResponse.json(
    data.map((l) =>
      lancamentoParaApi(
        l,
        nomeCategoriaPorId.get(l.categoria_id) ?? "—",
        l.cartao_id ? (nomeCartaoPorId.get(l.cartao_id) ?? null) : null,
      ),
    ),
  );
}

const criarApiSchema = z.object({
  nome: z.string().trim().min(1, "nome é obrigatório").max(120),
  tipo: z.enum(["entrada", "saida"]),
  // Nome da categoria de topo, não uuid — resolverCategoriaPorNome traduz.
  categoria: z.string().trim().min(1, "categoria é obrigatória"),
  // Nome de uma subcategoria dentro de 'categoria' — opcional; presente,
  // o lançamento fica ligado a ela (não à categoria de topo), igual ao
  // formulário (CategoriaSubcategoriaSelect).
  subcategoria: z.string().trim().min(1).optional(),
  valor_previsto: z.coerce.number().min(0, "valor_previsto não pode ser negativo"),
  // Sem cartão: data do vencimento (ou compra à vista). Com cartão: data DA
  // COMPRA — a rota resolve pro vencimento da fatura, igual ao formulário
  // (lib/actions/lancamentos.ts). Sem data, assume hoje.
  data_prevista: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data_prevista inválida, use yyyy-mm-dd").optional(),
  metodo: z.string().trim().max(60).optional(),
  pago: z.boolean().optional().default(false),
  // Nome do cartão, não uuid — resolverCartaoPorNome traduz. Opcional: sem
  // ele, o lançamento não é ligado a nenhum cartão (igual ao formulário).
  cartao: z.string().trim().min(1).optional(),
});

/** POST /api/lancamentos
 * Body: { nome, tipo, categoria, subcategoria?, valor_previsto, data_prevista?, metodo?, pago?, cartao? } */
export async function POST(request: NextRequest) {
  const erroAuth = verificarApiKey(request);
  if (erroAuth) return erroAuth;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corpo da requisição precisa ser JSON válido." }, { status: 400 });

  const parsed = criarApiSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const input = parsed.data;

  const admin = createAdminClient();
  const categoriaTopo = await resolverCategoriaPorNome(admin, input.categoria, input.tipo);
  if ("erro" in categoriaTopo) return NextResponse.json({ error: categoriaTopo.erro }, { status: categoriaTopo.status });

  let categoria: { id: string; nome: string } = categoriaTopo;
  if (input.subcategoria) {
    const sub = await resolverSubcategoriaPorNome(admin, categoriaTopo.id, categoriaTopo.nome, input.subcategoria);
    if ("erro" in sub) return NextResponse.json({ error: sub.erro }, { status: sub.status });
    categoria = sub;
  }

  let cartao: { id: string; nome: string; dia_fechamento: number; dia_vencimento: number } | null = null;
  if (input.cartao) {
    const resolvido = await resolverCartaoPorNome(admin, input.cartao);
    if ("erro" in resolvido) return NextResponse.json({ error: resolvido.erro }, { status: resolvido.status });
    cartao = resolvido;
  }

  const dataInformada = input.data_prevista ?? todayInAppTimezone();
  let dataPrevista = dataInformada;
  let dataCompra: string | null = null;
  if (cartao) {
    dataCompra = dataInformada;
    dataPrevista = calcularDataFatura(dataInformada, cartao.dia_fechamento, cartao.dia_vencimento);
  }

  const linha: Database["public"]["Tables"]["lancamentos"]["Insert"] = {
    user_id: env.APP_USER_ID!,
    nome: input.nome,
    tipo: input.tipo,
    categoria_id: categoria.id,
    valor_previsto: input.valor_previsto,
    data_prevista: dataPrevista,
    data_compra: dataCompra,
    cartao_id: cartao?.id ?? null,
    metodo: input.metodo || null,
    pago: input.pago,
    valor_pago: input.pago ? input.valor_previsto : null,
    data_pagamento: input.pago ? dataPrevista : null,
  };

  const { data, error } = await admin.from("lancamentos").insert(linha).select().single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Não foi possível criar." }, { status: 500 });

  return NextResponse.json(lancamentoParaApi(data, categoria.nome, cartao?.nome ?? null), { status: 201 });
}
