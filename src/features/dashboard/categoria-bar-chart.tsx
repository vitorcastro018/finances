"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SituacaoBadge } from "@/components/ui/situacao-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Situacao } from "@/lib/supabase/types";

export type LancamentoDaBarra = {
  id: string;
  nome: string;
  valor_previsto: number;
  valor_pago: number | null;
  data_prevista: string;
  situacao: Situacao;
};

export type ValorPorCategoria = {
  categoria: string;
  cor: string;
  total: number;
  lancamentos: LancamentoDaBarra[];
};

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
  const [selecionada, setSelecionada] = useState<ValorPorCategoria | null>(null);

  if (dados.length === 0) {
    return <p className="flex h-24 items-center justify-center text-sm text-muted-foreground">{mensagemVazio}</p>;
  }

  const altura = Math.max(ALTURA_MINIMA, dados.length * ALTURA_POR_BARRA + 20);
  // Maior valor primeiro (barra de cima pra baixo) — em todo gráfico de
  // categoria/subcategoria, exceto o de evolução mensal (que ordena por mês).
  const dadosOrdenados = [...dados].sort((a, b) => b.total - a.total);
  const lancamentosOrdenados = [...(selecionada?.lancamentos ?? [])].sort((a, b) =>
    a.data_prevista.localeCompare(b.data_prevista),
  );

  return (
    <>
      <ResponsiveContainer width="100%" height={altura}>
        <BarChart data={dadosOrdenados} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 4 }} barGap={4}>
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
          <Bar
            dataKey="total"
            radius={[0, 4, 4, 0]}
            barSize={20}
            className="cursor-pointer"
            onClick={(item: { payload?: ValorPorCategoria }) => item.payload && setSelecionada(item.payload)}
          >
            {dadosOrdenados.map((item) => (
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

      <Dialog open={selecionada !== null} onOpenChange={(open) => !open && setSelecionada(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selecionada?.categoria}</DialogTitle>
            <DialogDescription>
              {lancamentosOrdenados.length}{" "}
              {lancamentosOrdenados.length === 1 ? "lançamento" : "lançamentos"} · total{" "}
              {formatCurrency(selecionada?.total ?? 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {lancamentosOrdenados.map((lancamento) => (
              <div
                key={lancamento.id}
                className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{lancamento.nome}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(lancamento.data_prevista)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-medium">
                    {formatCurrency(lancamento.valor_pago ?? lancamento.valor_previsto)}
                  </span>
                  <SituacaoBadge situacao={lancamento.situacao} />
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
