const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** "1234.5" | 1234.5 -> "R$ 1.234,50" */
export function formatCurrency(value: number | string | null | undefined) {
  if (value === null || value === undefined) return "—";
  const numeric = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(numeric)) return "—";
  return currencyFormatter.format(numeric);
}

/** "2026-08-24" -> "24/08/2026" */
export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  // Datas vêm como "yyyy-mm-dd" (sem hora) — string pura, sem passar por
  // Date()/Intl: construir um Date e reformatar num fuso explícito depende
  // do fuso do sistema onde o código roda bater com o fuso de exibição, o
  // que não é garantido (ex.: build/CI rodam em UTC).
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "—";
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}
