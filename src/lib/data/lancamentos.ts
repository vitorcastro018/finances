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
