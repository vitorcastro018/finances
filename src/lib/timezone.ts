import { addMonths } from "date-fns";

const TIMEZONE = "America/Sao_Paulo";

/** Data de hoje em America/Sao_Paulo, como "yyyy-mm-dd". */
export function todayInAppTimezone(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date());
}

/** Mês corrente (America/Sao_Paulo) como referência "yyyy-mm-01". */
export function currentMonthRef(): string {
  return `${todayInAppTimezone().slice(0, 7)}-01`;
}

/** Valida `?ref=yyyy-mm` da URL; cai no mês corrente se ausente/inválido. */
export function parseMonthRef(raw: string | undefined): string {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    return `${raw}-01`;
  }
  return currentMonthRef();
}

/** "2026-08-01" -> "2026-08" (para usar de volta na URL). */
export function monthRefToParam(ref: string): string {
  return ref.slice(0, 7);
}

/** "2026-08-01" -> "2026-09-01" | "2026-07-01" */
export function shiftMonthRef(ref: string, deltaMonths: number): string {
  const [year, month, day] = ref.split("-").map(Number);
  const shifted = addMonths(new Date(year, month - 1, day), deltaMonths);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}-01`;
}

/** "2026-01-31" + 1 -> "2026-02-28" (clampa ao último dia do mês, como
 * `gerar_previstos_do_mes()` faz no banco para contas fixas). */
export function addMonthsToDate(date: string, months: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = addMonths(new Date(year, month - 1, 1), months);
  const ultimoDia = new Date(shifted.getFullYear(), shifted.getMonth() + 1, 0).getDate();
  const diaClamped = Math.min(day, ultimoDia);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}-${String(diaClamped).padStart(2, "0")}`;
}

const monthLabelFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: TIMEZONE,
});

/** "2026-08-01" -> "Agosto 2026" */
export function formatMonthLabel(ref: string): string {
  const [year, month, day] = ref.split("-").map(Number);
  const label = monthLabelFormatter.format(new Date(year, month - 1, day));
  return label.charAt(0).toUpperCase() + label.slice(1);
}
