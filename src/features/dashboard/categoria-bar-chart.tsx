"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatCurrency } from "@/lib/format";

export type ValorPorCategoria = { categoria: string; cor: string; total: number };

// Alto o bastante pra aguentar até 3 linhas quando o nome "Categoria ›
// Subcategoria" não cabe em 2 no espaço do rótulo (ver LARGURA_ROTULO) —
// o eixo Y quebra linha sozinho, sem cortar; isso só garante que as linhas
// vizinhas não se encostem quando isso acontece.
const ALTURA_POR_BARRA = 54;
const ALTURA_MINIMA = 140;
// Card fica lado a lado com outro no desktop (grid de 2 colunas) e sozinho,
// mais estreito ainda, no celular — largura pensada pra caber nos dois sem
// os rótulos comerem a maior parte do espaço da barra.
const LARGURA_ROTULO = 112;
const MAX_CARACTERES_ROTULO = 24;

/** "Despesas Fixas › Faculdade Duda" -> "Despesas Fixas › Facul…" — só pro
 * texto do eixo (tick), que tem um espaço fixo. O nome completo continua
 * inteiro nos dados, então a tooltip ao passar o mouse mostra sem cortar. */
function truncarRotulo(valor: string): string {
  if (valor.length <= MAX_CARACTERES_ROTULO) return valor;
  return `${valor.slice(0, MAX_CARACTERES_ROTULO - 1)}…`;
}

/** Barras horizontais: nomes de categoria/subcategoria (às vezes longos,
 * "Pai › Filho") ficam no eixo Y, na horizontal, sem precisar girar o texto
 * nem cortar — o motivo do gráfico anterior (colunas verticais com rótulo
 * inclinado) vazar da área do card. */
export function CategoriaBarChart({
  dados,
  mensagemVazio = "Nada registrado neste mês.",
}: {
  dados: ValorPorCategoria[];
  mensagemVazio?: string;
}) {
  if (dados.length === 0) {
    return <p className="flex h-24 items-center justify-center text-sm text-muted-foreground">{mensagemVazio}</p>;
  }

  const altura = Math.max(ALTURA_MINIMA, dados.length * ALTURA_POR_BARRA + 20);

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={dados} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 4 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
        <XAxis
          type="number"
          domain={[0, (max: number) => max * 1.15]}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => formatCurrency(value)}
        />
        <YAxis
          type="category"
          dataKey="categoria"
          width={LARGURA_ROTULO}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={truncarRotulo}
        />
        <Tooltip
          formatter={(value) => formatCurrency(Number(value))}
          cursor={{ fill: "var(--muted)" }}
          contentStyle={{
            background: "var(--popover)",
            color: "var(--popover-foreground)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            fontSize: 12,
          }}
        />
        <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={20}>
          {dados.map((item) => (
            <Cell key={item.categoria} fill={item.cor} />
          ))}
          <LabelList
            dataKey="total"
            position="right"
            formatter={(value) => (typeof value === "number" ? formatCurrency(value) : "")}
            style={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
