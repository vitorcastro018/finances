import type { NextRequest } from "next/server";

import { getCategorias } from "@/lib/data/categorias";
import { buscarLancamentosParaExport } from "@/lib/data/lancamentos";
import { filtroLancamentosSchema } from "@/lib/validation/lancamentos";

const cabecalho = ["Data", "Nome", "Tipo", "Categoria", "Valor previsto", "Valor pago", "Método", "Pago", "Origem"];

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

  const [linhas, categorias] = await Promise.all([
    buscarLancamentosParaExport(filtros),
    getCategorias(),
  ]);

  const nomeCategoria = new Map(categorias.map((c) => [c.id, c.nome]));

  const linhasCsv = linhas.map((l) =>
    [
      dataPtBr(l.data_prevista),
      l.nome,
      l.tipo === "entrada" ? "Entrada" : "Saída",
      nomeCategoria.get(l.categoria_id) ?? "",
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
