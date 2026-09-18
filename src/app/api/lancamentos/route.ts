import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { verificarApiKey } from "@/lib/api/auth";
import { resolverCategoriaPorNome } from "@/lib/api/categorias";
import { lancamentoParaApi } from "@/lib/api/lancamentos";
import { semCamposVazios } from "@/lib/api/query-utils";
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
    pago: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === "true")),
    busca: z.string().trim().max(120).optional(),
  }),
);

/** GET /api/lancamentos?mes=2026-09&tipo=saida&categoria=Mercado&pago=false&busca=uber */
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
  }

  let query = admin.from("lancamentos").select("*").eq("user_id", env.APP_USER_ID!);
  const range = rangeDoMes(filtros.mes);
  if (range) query = query.gte("data_prevista", range.de).lte("data_prevista", range.ate);
  if (filtros.tipo) query = query.eq("tipo", filtros.tipo);
  if (categoriaId) query = query.eq("categoria_id", categoriaId);
  if (filtros.pago !== undefined) query = query.eq("pago", filtros.pago);
  if (filtros.busca) query = query.ilike("nome", `%${filtros.busca}%`);

  const { data, error } = await query.order("data_prevista", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: categorias } = await admin.from("categorias").select("id, nome").eq("user_id", env.APP_USER_ID!);
  const nomePorId = new Map((categorias ?? []).map((c) => [c.id, c.nome]));

  return NextResponse.json(data.map((l) => lancamentoParaApi(l, nomePorId.get(l.categoria_id) ?? "—")));
}

const criarApiSchema = z.object({
  nome: z.string().trim().min(1, "nome é obrigatório").max(120),
  tipo: z.enum(["entrada", "saida"]),
  // Nome da categoria, não uuid — resolverCategoriaPorNome traduz.
  categoria: z.string().trim().min(1, "categoria é obrigatória"),
  valor_previsto: z.coerce.number().min(0, "valor_previsto não pode ser negativo"),
  // Sem data, assume hoje — conveniente pro agente não precisar calcular.
  data_prevista: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data_prevista inválida, use yyyy-mm-dd").optional(),
  metodo: z.string().trim().max(60).optional(),
  pago: z.boolean().optional().default(false),
});

/** POST /api/lancamentos
 * Body: { nome, tipo, categoria, valor_previsto, data_prevista?, metodo?, pago? } */
export async function POST(request: NextRequest) {
  const erroAuth = verificarApiKey(request);
  if (erroAuth) return erroAuth;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corpo da requisição precisa ser JSON válido." }, { status: 400 });

  const parsed = criarApiSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const input = parsed.data;

  const admin = createAdminClient();
  const categoria = await resolverCategoriaPorNome(admin, input.categoria, input.tipo);
  if ("erro" in categoria) return NextResponse.json({ error: categoria.erro }, { status: categoria.status });

  const dataPrevista = input.data_prevista ?? todayInAppTimezone();
  const linha: Database["public"]["Tables"]["lancamentos"]["Insert"] = {
    user_id: env.APP_USER_ID!,
    nome: input.nome,
    tipo: input.tipo,
    categoria_id: categoria.id,
    valor_previsto: input.valor_previsto,
    data_prevista: dataPrevista,
    metodo: input.metodo || null,
    pago: input.pago,
    valor_pago: input.pago ? input.valor_previsto : null,
    data_pagamento: input.pago ? dataPrevista : null,
  };

  const { data, error } = await admin.from("lancamentos").insert(linha).select().single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Não foi possível criar." }, { status: 500 });

  return NextResponse.json(lancamentoParaApi(data, categoria.nome), { status: 201 });
}
