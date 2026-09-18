import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { verificarApiKey } from "@/lib/api/auth";
import { buscarCategoriaTopoPorNome } from "@/lib/api/categorias";
import { semCamposVazios } from "@/lib/api/query-utils";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

const filtroApiSchema = z.preprocess(
  semCamposVazios,
  z.object({
    tipo: z.enum(["entrada", "saida"]).optional(),
  }),
);

/** GET /api/categorias?tipo=saida — categorias de topo com as subcategorias
 * já aninhadas, do mesmo jeito que /categorias mostra na tela. */
export async function GET(request: NextRequest) {
  const erroAuth = verificarApiKey(request);
  if (erroAuth) return erroAuth;

  const parsed = filtroApiSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const admin = createAdminClient();
  let query = admin.from("categorias").select("*").eq("user_id", env.APP_USER_ID!).order("nome");
  if (parsed.data.tipo) query = query.eq("tipo", parsed.data.tipo);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const categorias = data ?? [];
  const topo = categorias.filter((c) => !c.categoria_pai_id);
  const resposta = topo.map((c) => ({
    id: c.id,
    nome: c.nome,
    tipo: c.tipo,
    cor: c.cor,
    subcategorias: categorias
      .filter((sub) => sub.categoria_pai_id === c.id)
      .map((sub) => ({ id: sub.id, nome: sub.nome, cor: sub.cor })),
  }));

  return NextResponse.json(resposta);
}

const criarApiSchema = z.object({
  nome: z.string().trim().min(1, "nome é obrigatório").max(60),
  // Obrigatório só pra categoria de topo — numa subcategoria (categoria_pai
  // preenchido) é ignorado: tipo e cor são sempre herdados do pai, mesma
  // regra da tela (SubcategoriaFormDialog).
  tipo: z.enum(["entrada", "saida"]).optional(),
  cor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "cor inválida, use #rrggbb")
    .optional(),
  // Nome de uma categoria de topo já existente — presente = cria uma
  // subcategoria dentro dela; ausente = cria categoria de topo.
  categoria_pai: z.string().trim().min(1).optional(),
});

/** POST /api/categorias
 * Categoria de topo: { nome, tipo, cor? }
 * Subcategoria: { nome, categoria_pai } — tipo/cor vêm do pai. */
export async function POST(request: NextRequest) {
  const erroAuth = verificarApiKey(request);
  if (erroAuth) return erroAuth;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corpo da requisição precisa ser JSON válido." }, { status: 400 });

  const parsed = criarApiSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const input = parsed.data;

  const admin = createAdminClient();
  const linha: Database["public"]["Tables"]["categorias"]["Insert"] = {
    user_id: env.APP_USER_ID!,
    nome: input.nome,
    tipo: "saida", // placeholder — sempre sobrescrito abaixo antes do insert
  };
  let categoriaPaiNome: string | null = null;

  if (input.categoria_pai) {
    const pai = await buscarCategoriaTopoPorNome(admin, input.categoria_pai, input.tipo);
    if ("erro" in pai) return NextResponse.json({ error: pai.erro }, { status: pai.status });
    linha.categoria_pai_id = pai.id;
    linha.tipo = pai.tipo;
    linha.cor = pai.cor;
    categoriaPaiNome = pai.nome;
  } else {
    if (!input.tipo) {
      return NextResponse.json(
        { error: "Informe 'tipo' (entrada/saida) pra criar uma categoria de topo, ou 'categoria_pai' pra criar uma subcategoria." },
        { status: 400 },
      );
    }
    linha.tipo = input.tipo;
    if (input.cor) linha.cor = input.cor;
  }

  const { data, error } = await admin.from("categorias").insert(linha).select().single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Já existe uma categoria com esse nome." }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { id: data.id, nome: data.nome, tipo: data.tipo, cor: data.cor, categoria_pai: categoriaPaiNome },
    { status: 201 },
  );
}
