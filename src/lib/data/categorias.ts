import { createClient } from "@/lib/supabase/server";
import type { CategoriaRow } from "@/lib/supabase/types";

/** Todas as categorias do usuário (topo e subcategorias juntas, ordenadas
 * por nome). Usada em toda tela que precisa popular um <select> de
 * categoria — combine com `ordenarCategoriasParaSelect` (em
 * `@/lib/categorias`) pra agrupar visualmente pai/filho. */
export async function getCategorias(): Promise<CategoriaRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categorias").select("*").order("nome");
  if (error) throw error;
  return data ?? [];
}

export type CategoriaComSubcategorias = CategoriaRow & { subcategorias: CategoriaRow[] };

/** Categorias de topo com as subcategorias já aninhadas — usada em
 * /categorias. Uma única query; o agrupamento é feito aqui em vez de
 * precisar de uma tabela separada de subcategorias. */
export async function getCategoriasComSubcategorias(): Promise<CategoriaComSubcategorias[]> {
  const categorias = await getCategorias();
  const topo = categorias.filter((c) => !c.categoria_pai_id);
  return topo.map((categoria) => ({
    ...categoria,
    subcategorias: categorias.filter((c) => c.categoria_pai_id === categoria.id),
  }));
}
