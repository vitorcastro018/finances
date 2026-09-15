import { calcularSituacao } from "@/lib/situacao";
import type { LancamentoRow, Situacao, TipoLancamento } from "@/lib/supabase/types";

/** Formato de resposta da API — categoria já resolvida pro nome (o agente
 * não trabalha com uuid) e a situação calculada, do jeito que /lancamentos
 * já mostra na tela. */
export type LancamentoApi = {
  id: string;
  nome: string;
  tipo: TipoLancamento;
  categoria: string;
  valor_previsto: number;
  valor_pago: number | null;
  data_prevista: string;
  data_pagamento: string | null;
  pago: boolean;
  situacao: Situacao;
  metodo: string | null;
};

export function lancamentoParaApi(lancamento: LancamentoRow, nomeCategoria: string): LancamentoApi {
  return {
    id: lancamento.id,
    nome: lancamento.nome,
    tipo: lancamento.tipo,
    categoria: nomeCategoria,
    valor_previsto: lancamento.valor_previsto,
    valor_pago: lancamento.valor_pago,
    data_prevista: lancamento.data_prevista,
    data_pagamento: lancamento.data_pagamento,
    pago: lancamento.pago,
    situacao: calcularSituacao(lancamento.pago, lancamento.data_prevista),
    metodo: lancamento.metodo,
  };
}
