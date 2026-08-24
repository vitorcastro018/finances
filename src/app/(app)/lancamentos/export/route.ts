import type { NextRequest } from "next/server";

import { getGruposComSubgrupos } from "@/lib/data/categorias";
import { buscarLancamentosParaExport } from "@/lib/data/lancamentos";
import { filtroLancamentosSchema } from "@/lib/validation/lancamentos";

const cabecalho = ["Data", "Nome", "Tipo", "Grupo", "Subgrupo", "Valor previsto", "Valor pago", "Método", "Pago", "Origem"];

function csvCampo(valor: string) {
  if (/[";\n]/.test(valor)) return `"${valor.replace(/"/g, '""')}"`;
  return valor;
}

function valorPtBr(valor: number | null) {
  if (valor === null) return "";
  return valor.toFixed(2).replace(".", ",");
}

function dataPtBr(valor: string | null) {
  if (!valor) return "";
  const [ano, mes, dia] = valor.split("-");
  return `${dia}/${mes}/${ano}`;
}

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const filtros = filtroLancamentosSchema.parse(params);

  const [linhas, grupos] = await Promise.all([
    buscarLancamentosParaExport(filtros),
    getGruposComSubgrupos(),
  ]);

  const nomeGrupo = new Map(grupos.map((g) => [g.id, g.nome]));
  const nomeSubgrupo = new Map(grupos.flatMap((g) => g.subgrupos.map((s) => [s.id, s.nome] as const)));

  const linhasCsv = linhas.map((l) =>
    [
      dataPtBr(l.data_prevista),
      l.nome,
      l.tipo === "entrada" ? "Entrada" : "Saída",
      nomeGrupo.get(l.grupo_id) ?? "",
      l.subgrupo_id ? (nomeSubgrupo.get(l.subgrupo_id) ?? "") : "",
      valorPtBr(l.valor_previsto),
      valorPtBr(l.valor_pago),
      l.metodo ?? "",
      l.pago ? "Sim" : "Não",
      l.origem,
    ]
      .map(csvCampo)
      .join(";"),
  );

  const csv = "﻿" + [cabecalho.join(";"), ...linhasCsv].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lancamentos.csv"`,
    },
  });
}
