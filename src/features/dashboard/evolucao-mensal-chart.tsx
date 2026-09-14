"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatCurrency } from "@/lib/format";

export type EvolucaoMes = { mes: string; entrada: number; saida: number };

const NOME_SERIE: Record<string, string> = { entrada: "Entradas", saida: "Saídas" };

/** Entrada x saída (realizadas) lado a lado, mês a mês — a "foto" do mês
 * atual (cards + gráficos por categoria) não mostra tendência; isso mostra
 * se as entradas estão acompanhando as saídas ao longo do tempo. */
export function EvolucaoMensalChart({ dados }: { dados: EvolucaoMes[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={dados} margin={{ top: 4, right: 8, bottom: 4, left: 4 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
        <XAxis
          dataKey="mes"
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(value: number) => formatCurrency(value)}
        />
        <Tooltip
          formatter={(value, name) => [formatCurrency(Number(value)), NOME_SERIE[String(name)] ?? String(name)]}
          cursor={{ fill: "var(--muted)" }}
          contentStyle={{
            background: "var(--popover)",
            color: "var(--popover-foreground)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            fontSize: 12,
          }}
        />
        <Legend
          formatter={(value) => <span style={{ color: "var(--muted-foreground)" }}>{NOME_SERIE[value] ?? value}</span>}
          iconType="circle"
          wrapperStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="entrada" name="entrada" fill="var(--success)" radius={[4, 4, 0, 0]} barSize={16} />
        <Bar dataKey="saida" name="saida" fill="var(--destructive)" radius={[4, 4, 0, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}
