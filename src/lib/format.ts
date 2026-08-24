const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
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
  // Datas vêm como "yyyy-mm-dd" (sem hora) — parse manual evita o Date()
  // nativo interpretar como UTC meia-noite e "voltar" um dia em fusos negativos.
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "—";
  return dateFormatter.format(new Date(year, month - 1, day));
}
