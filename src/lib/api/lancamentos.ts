import { calcularSituacao } from "@/lib/situacao";
import type { LancamentoRow, Situacao, TipoLancamento } from "@/lib/supabase/types";

/** Formato de resposta da API — categoria (e subcategoria, se houver) já
 * resolvidas pro nome (o agente não trabalha com uuid) e a situação
 * calculada, do jeito que /lancamentos já mostra na tela. */
export type LancamentoApi = {
  id: string;
  nome: string;
  tipo: TipoLancamento;
  categoria: string;
  // null quando o lançamento está direto na categoria de topo, sem subcategoria.
  subcategoria: string | null;
  valor_previsto: number;
  valor_pago: number | null;
  data_prevista: string;
  data_pagamento: string | null;
  pago: boolean;
  situacao: Situacao;
  metodo: string | null;
  cartao: string | null;
  // Só preenchida quando tem cartão — `data_prevista` nesse caso já é o
  // vencimento da fatura (calcularDataFatura em lib/cartoes.ts), não o dia
  // da compra.
  data_compra: string | null;
};

export function lancamentoParaApi(
  lancamento: LancamentoRow,
  nomeCategoria: string,
  nomeSubcategoria: string | null = null,
  nomeCartao: string | null = null,
): LancamentoApi {
  return {
    id: lancamento.id,
    nome: lancamento.nome,
    tipo: lancamento.tipo,
    categoria: nomeCategoria,
    subcategoria: nomeSubcategoria,
    valor_previsto: lancamento.valor_previsto,
    valor_pago: lancamento.valor_pago,
    data_prevista: lancamento.data_prevista,
    data_pagamento: lancamento.data_pagamento,
    pago: lancamento.pago,
    situacao: calcularSituacao(lancamento.pago, lancamento.data_prevista),
    metodo: lancamento.metodo,
    cartao: nomeCartao,
    data_compra: lancamento.data_compra,
  };
}

type CategoriaResumo = { nome: string; categoria_pai_id: string | null };

/** `categoria_id` de um lançamento pode apontar tanto pra uma categoria de
 * topo quanto pra uma subcategoria (mesma regra da tela — ver
 * CategoriaSubcategoriaSelect). Resolve os dois nomes a partir do mapa de
 * categorias do usuário, pra API sempre devolver `categoria` (topo) e
 * `subcategoria` (ou null) separados. */
export function resolverNomesCategoria(
  categoriaId: string,
  categoriasPorId: Map<string, CategoriaResumo>,
): { categoria: string; subcategoria: string | null } {
  const c = categoriasPorId.get(categoriaId);
  if (!c) return { categoria: "—", subcategoria: null };
  if (!c.categoria_pai_id) return { categoria: c.nome, subcategoria: null };

  const pai = categoriasPorId.get(c.categoria_pai_id);
  return { categoria: pai?.nome ?? "—", subcategoria: c.nome };
}
