import { todayInAppTimezone } from "@/lib/timezone";
import type { Situacao } from "@/lib/supabase/types";

/** Mesma regra de `contas_do_mes()` no banco, mas calculada em JS — usada em
 * /lancamentos, que busca direto da tabela `lancamentos` (não da função SQL,
 * já que aqui também precisa listar "todos os períodos", não só um mês). */
export function calcularSituacao(pago: boolean, dataPrevista: string): Situacao {
  if (pago) return "pago";
  return dataPrevista < todayInAppTimezone() ? "atrasado" : "a_vencer";
}
