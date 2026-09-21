import { addMonths } from "date-fns";

/** Em qual fatura uma compra cai, a partir do dia de fechamento e de
 * vencimento do cartão. Mesma lógica existe em SQL (função `data_fatura()`,
 * ver supabase/migrations/09_cartoes.sql) — lá é usada só por
 * `gerar_previstos_do_mes()`; aqui é usada pro preview instantâneo no
 * formulário e pra resolver a data ao criar/editar um lançamento manual
 * (lib/actions/lancamentos.ts), sem precisar de uma chamada a mais no banco.
 *
 * Regra: comprou depois do fechamento -> cai na fatura que fecha no mês
 * seguinte. Dia de vencimento menor que o de fechamento só faz sentido se
 * vencer no mês seguinte ao fechamento (ex.: fecha dia 25, vence dia 5 do
 * mês depois); vencimento >= fechamento vence no mesmo mês do fechamento. */
export function calcularDataFatura(dataCompra: string, diaFechamento: number, diaVencimento: number): string {
  const [ano, mes, dia] = dataCompra.split("-").map(Number);

  let fechamento = new Date(ano, mes - 1, 1);
  if (dia > diaFechamento) fechamento = addMonths(fechamento, 1);

  let vencimento = fechamento;
  if (diaVencimento < diaFechamento) vencimento = addMonths(vencimento, 1);

  const ultimoDia = new Date(vencimento.getFullYear(), vencimento.getMonth() + 1, 0).getDate();
  const diaFinal = Math.min(diaVencimento, ultimoDia);
  return `${vencimento.getFullYear()}-${String(vencimento.getMonth() + 1).padStart(2, "0")}-${String(diaFinal).padStart(2, "0")}`;
}
