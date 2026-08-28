import { createClient } from "@/lib/supabase/server";
import type { FiltroLancamentos } from "@/lib/validation/lancamentos";
import type { LancamentoRow } from "@/lib/supabase/types";

export const PAGE_SIZE = 20;

export async function buscarLancamentos(
  filtros: FiltroLancamentos,
): Promise<{ linhas: LancamentoRow[]; total: number }> {
  const supabase = await createClient();
  const offset = (filtros.pagina - 1) * PAGE_SIZE;

  let query = supabase.from("lancamentos").select("*", { count: "exact" });
  if (filtros.de) query = query.gte("data_prevista", filtros.de);
  if (filtros.ate) query = query.lte("data_prevista", filtros.ate);
  if (filtros.categoria_id) query = query.eq("categoria_id", filtros.categoria_id);
  if (filtros.tipo) query = query.eq("tipo", filtros.tipo);
  if (filtros.pago) query = query.eq("pago", filtros.pago === "true");
  if (filtros.busca) query = query.ilike("nome", `%${filtros.busca}%`);

  const { data, count, error } = await query
    .order("data_prevista", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);
  if (error) throw error;
  return { linhas: data ?? [], total: count ?? 0 };
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

/** Todas as linhas do período filtrado, sem paginação — para o export CSV. */
export async function buscarLancamentosParaExport(filtros: FiltroLancamentos): Promise<LancamentoRow[]> {
  const supabase = await createClient();

  let query = supabase.from("lancamentos").select("*");
  if (filtros.de) query = query.gte("data_prevista", filtros.de);
  if (filtros.ate) query = query.lte("data_prevista", filtros.ate);
  if (filtros.categoria_id) query = query.eq("categoria_id", filtros.categoria_id);
  if (filtros.tipo) query = query.eq("tipo", filtros.tipo);
  if (filtros.pago) query = query.eq("pago", filtros.pago === "true");
  if (filtros.busca) query = query.ilike("nome", `%${filtros.busca}%`);

  const { data, error } = await query.order("data_prevista", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
