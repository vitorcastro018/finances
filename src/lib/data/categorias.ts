import { createClient } from "@/lib/supabase/server";
import type { GrupoRow, SubgrupoRow } from "@/lib/supabase/types";

export type GrupoComSubgrupos = GrupoRow & { subgrupos: SubgrupoRow[] };

/** Grupos com seus subgrupos aninhados, ordenados por nome. Usado em toda tela
 * que precisa popular um <select> de grupo/subgrupo, além de /categorias. */
export async function getGruposComSubgrupos(): Promise<GrupoComSubgrupos[]> {
  const supabase = await createClient();
  const [{ data: grupos }, { data: subgrupos }] = await Promise.all([
    supabase.from("grupos").select("*").order("nome"),
    supabase.from("subgrupos").select("*").order("nome"),
  ]);

  return (grupos ?? []).map((grupo) => ({
    ...grupo,
    subgrupos: (subgrupos ?? []).filter((s) => s.grupo_id === grupo.id),
  }));
}
