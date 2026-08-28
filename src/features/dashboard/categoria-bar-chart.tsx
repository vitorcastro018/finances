"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";

import { formatCurrency } from "@/lib/format";

export type GastoPorCategoria = { categoria: string; cor: string; total: number };

export function CategoriaBarChart({ dados }: { dados: GastoPorCategoria[] }) {
  if (dados.length === 0) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Nenhum gasto registrado neste mês.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={dados} margin={{ left: 8, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
        <XAxis
          dataKey="categoria"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          interval={0}
          angle={-15}
          textAnchor="end"
          height={50}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(value: number) => formatCurrency(value)}
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
        <Bar dataKey="total" radius={[4, 4, 0, 0]}>
          {dados.map((item) => (
            <Cell key={item.categoria} fill={item.cor} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
