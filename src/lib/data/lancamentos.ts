import { createClient } from "@/lib/supabase/server";
import type { FiltroLancamentos } from "@/lib/validation/lancamentos";
import type { LancamentoRow } from "@/lib/supabase/types";

/** "2026-09" -> { de: "2026-09-01", ate: "2026-09-30" }. "todos" -> null
 * (sem filtro de data). */
function rangeDoMes(mes: string): { de: string; ate: string } | null {
  if (mes === "todos") return null;
  const [ano, mesNumero] = mes.split("-").map(Number);
  const ultimoDia = new Date(ano, mesNumero, 0).getDate();
  return { de: `${mes}-01`, ate: `${mes}-${String(ultimoDia).padStart(2, "0")}` };
}

/** Coluna(s) real(is) por trás de cada cabeçalho clicável. "situacao" não é
 * uma coluna — agrupa por pago e desempata por data, mais simples que
 * replicar a regra completa de atrasado/a vencer (calculada em JS). E
 * "categoria" também não é coluna aqui (é o nome da categoria ligada, não
 * `categoria_id`) — essa é reordenada à parte, em JS, depois de buscar (ver
 * LancamentosPage), então aqui só cai num fallback razoável. */
function ordenacaoParaColunas(
  ordenar: FiltroLancamentos["ordenar"],
  direcao: "asc" | "desc",
): { coluna: string; crescente: boolean }[] {
  const crescente = direcao === "asc";
  switch (ordenar) {
    case "situacao":
      return [
        { coluna: "pago", crescente },
        { coluna: "data_prevista", crescente: true },
      ];
    case "nome":
      return [{ coluna: "nome", crescente }];
    case "tipo":
      return [{ coluna: "tipo", crescente }];
    case "valor":
      return [{ coluna: "valor_previsto", crescente }];
    case "metodo":
      return [{ coluna: "metodo", crescente }];
    case "origem":
      return [{ coluna: "origem", crescente }];
    case "data":
      return [{ coluna: "data_prevista", crescente }];
    default:
      return [{ coluna: "data_prevista", crescente: false }];
  }
}

/** Sem paginação — mostra tudo que bate com o filtro numa página só. O
 * filtro de mês já limita o tamanho normal de uso; quando alguém escolhe
 * "Todo o período" a lista pode crescer bastante, mas é a troca que foi
 * pedida no lugar de paginar. */
export async function buscarLancamentos(filtros: FiltroLancamentos): Promise<LancamentoRow[]> {
  const supabase = await createClient();
  const range = rangeDoMes(filtros.mes);

  let query = supabase.from("lancamentos").select("*");
  if (range) query = query.gte("data_prevista", range.de).lte("data_prevista", range.ate);
  if (filtros.categoria_id) query = query.eq("categoria_id", filtros.categoria_id);
  if (filtros.tipo) query = query.eq("tipo", filtros.tipo);
  if (filtros.pago) query = query.eq("pago", filtros.pago === "true");
  if (filtros.busca) query = query.ilike("nome", `%${filtros.busca}%`);

  for (const { coluna, crescente } of ordenacaoParaColunas(filtros.ordenar, filtros.direcao)) {
    query = query.order(coluna, { ascending: crescente });
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export type ParcelamentoAberto = {
  parcelamento_id: string;
  nome: string;
  parcela_total: number;
  parcelas_pagas: number;
  proxima_data: string | null;
  valor_parcela: number;
  valor_restante: number;
};

/** Compras parceladas com pelo menos uma parcela em aberto — "TV, faltam 4
 * de 6, próxima em set/2026". Cada parcela já é um lançamento normal; aqui
 * só agrupamos pelo `parcelamento_id` em vez de precisar de uma tabela nova. */
export async function getParcelamentosAbertos(): Promise<ParcelamentoAberto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lancamentos")
    .select("parcelamento_id, nome, parcela_total, pago, valor_previsto, data_prevista")
    .not("parcelamento_id", "is", null)
    .order("data_prevista");
  if (error) throw error;

  const grupos = new Map<string, NonNullable<typeof data>>();
  for (const linha of data ?? []) {
    const grupo = grupos.get(linha.parcelamento_id!) ?? [];
    grupo.push(linha);
    grupos.set(linha.parcelamento_id!, grupo);
  }

  const resultado: ParcelamentoAberto[] = [];
  for (const [parcelamentoId, linhas] of grupos) {
    const pendentes = linhas.filter((l) => !l.pago);
    if (pendentes.length === 0) continue; // já quitado
    resultado.push({
      parcelamento_id: parcelamentoId,
      // O nome de cada linha já vem como "TV (2/6)" — tira o sufixo pra exibir só "TV".
      nome: linhas[0].nome.replace(/\s*\(\d+\/\d+\)$/, ""),
      parcela_total: linhas[0].parcela_total ?? linhas.length,
      parcelas_pagas: linhas.length - pendentes.length,
      proxima_data: pendentes[0]?.data_prevista ?? null,
      valor_parcela: pendentes[0]?.valor_previsto ?? 0,
      valor_restante: pendentes.reduce((soma, l) => soma + l.valor_previsto, 0),
    });
  }
  return resultado.sort((a, b) => (a.proxima_data ?? "").localeCompare(b.proxima_data ?? ""));
}
