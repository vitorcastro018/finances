import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { verificarApiKey } from "@/lib/api/auth";
import { rangeDoMes } from "@/lib/data/lancamentos";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentMonthRef, monthRefToParam } from "@/lib/timezone";
import type { CategoriaRow, LancamentoRow } from "@/lib/supabase/types";

const filtroSchema = z.object({
  mes: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "mes inválido, use yyyy-mm")
    .default(() => monthRefToParam(currentMonthRef())),
});

type ValorPorCategoria = { categoria: string; total: number };

/** Mesmo agrupamento do dashboard (rollup até a categoria de topo) — ver
 * agruparPorCategoria em src/app/(app)/page.tsx. Duplicado de propósito: a
 * versão da tela usa o cliente de sessão, essa usa o admin; não dava pra
 * compartilhar a função sem misturar os dois clientes. */
function agruparPorCategoria(linhas: LancamentoRow[], categoriaPorId: Map<string, CategoriaRow>): ValorPorCategoria[] {
  const mapa = new Map<string, ValorPorCategoria>();
  for (const l of linhas) {
    const categoria = categoriaPorId.get(l.categoria_id);
    const topo = categoria?.categoria_pai_id ? categoriaPorId.get(categoria.categoria_pai_id) : categoria;
    const chave = topo?.id ?? l.categoria_id;
    const atual = mapa.get(chave) ?? { categoria: topo?.nome ?? "—", total: 0 };
    atual.total += l.valor_previsto;
    mapa.set(chave, atual);
  }
  return [...mapa.values()];
}

/** GET /api/indicadores?mes=2026-09 — os mesmos números do dashboard. */
export async function GET(request: NextRequest) {
  const erroAuth = verificarApiKey(request);
  if (erroAuth) return erroAuth;

  const parsed = filtroSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const { mes } = parsed.data;
  const range = rangeDoMes(mes)!; // schema não aceita "todos", range nunca é null aqui

  const admin = createAdminClient();
  const [{ data: linhas, error: erroLancamentos }, { data: categorias, error: erroCategorias }] = await Promise.all([
    admin
      .from("lancamentos")
      .select("*")
      .eq("user_id", env.APP_USER_ID!)
      .gte("data_prevista", range.de)
      .lte("data_prevista", range.ate),
    admin.from("categorias").select("*").eq("user_id", env.APP_USER_ID!),
  ]);
  if (erroLancamentos) return NextResponse.json({ error: erroLancamentos.message }, { status: 500 });
  if (erroCategorias) return NextResponse.json({ error: erroCategorias.message }, { status: 500 });

  const categoriaPorId = new Map((categorias ?? []).map((c) => [c.id, c] as const));
  const saidas = (linhas ?? []).filter((l) => l.tipo === "saida");
  const entradas = (linhas ?? []).filter((l) => l.tipo === "entrada");

  const previstoAPagar = saidas.reduce((soma, l) => soma + l.valor_previsto, 0);
  const jaPago = saidas.filter((l) => l.pago).reduce((soma, l) => soma + (l.valor_pago ?? l.valor_previsto), 0);
  const faltamPagar = saidas.filter((l) => !l.pago).length;

  const previstoAReceber = entradas.reduce((soma, l) => soma + l.valor_previsto, 0);
  const jaRecebido = entradas.filter((l) => l.pago).reduce((soma, l) => soma + (l.valor_pago ?? l.valor_previsto), 0);

  return NextResponse.json({
    mes,
    previsto_a_pagar: previstoAPagar,
    ja_pago: jaPago,
    faltam_pagar: faltamPagar,
    previsto_a_receber: previstoAReceber,
    ja_recebido: jaRecebido,
    // Tudo previsto de entrada menos tudo previsto de saída, pago ou não —
    // mesma definição do card "Saldo previsto" no dashboard.
    saldo_previsto: previstoAReceber - previstoAPagar,
    // Só o que já foi pago/recebido — mesma definição do "Saldo do mês".
    saldo_do_mes: jaRecebido - jaPago,
    gasto_por_categoria: agruparPorCategoria(saidas, categoriaPorId),
    receita_por_categoria: agruparPorCategoria(entradas, categoriaPorId),
  });
}
