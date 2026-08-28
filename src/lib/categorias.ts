import type { CategoriaRow } from "@/lib/supabase/types";

export type CategoriaOption = { id: string; label: string };

/** Achata a lista de categorias pra um <select>: cada categoria de topo
 * aparece sozinha, e logo em seguida suas subcategorias como "Pai › Filho" —
 * assim dá pra lançar tanto na categoria "genérica" quanto numa subcategoria
 * específica, sem precisar de um componente de árvore. */
export function ordenarCategoriasParaSelect(categorias: CategoriaRow[]): CategoriaOption[] {
  const subcategoriasPorPai = new Map<string, CategoriaRow[]>();
  const topo: CategoriaRow[] = [];
  for (const categoria of categorias) {
    if (categoria.categoria_pai_id) {
      const lista = subcategoriasPorPai.get(categoria.categoria_pai_id) ?? [];
      lista.push(categoria);
      subcategoriasPorPai.set(categoria.categoria_pai_id, lista);
    } else {
      topo.push(categoria);
    }
  }

  const opcoes: CategoriaOption[] = [];
  for (const pai of topo) {
    opcoes.push({ id: pai.id, label: pai.nome });
    for (const filha of subcategoriasPorPai.get(pai.id) ?? []) {
      opcoes.push({ id: filha.id, label: `${pai.nome} › ${filha.nome}` });
    }
  }
  return opcoes;
}
