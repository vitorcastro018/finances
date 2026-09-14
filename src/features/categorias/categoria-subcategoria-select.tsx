"use client";

import { useMemo } from "react";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoriaQuickCreate } from "@/features/categorias/categoria-quick-create";
import { SubcategoriaQuickCreate } from "@/features/categorias/subcategoria-quick-create";
import type { CategoriaRow, TipoLancamento } from "@/lib/supabase/types";

const SEM_SUBCATEGORIA = "__nenhuma__";

type Props = {
  /** Lista já filtrada pelo tipo (entrada/saída) quando fizer sentido — ver
   * chamadores. Inclui categorias de topo e subcategorias juntas. */
  categorias: CategoriaRow[];
  /** categoria_id atual — pode ser tanto uma categoria de topo quanto uma
   * subcategoria (ex.: ao editar um lançamento já lançado numa subcategoria). */
  value: string;
  onChange: (categoriaId: string) => void;
  /** Presentes só onde faz sentido criar categoria na hora (lançamento,
   * parcelamento) — omitir esconde o botão "+". */
  tipo?: TipoLancamento;
  onCategoriaCriada?: (categoria: CategoriaRow) => void;
};

/** Categoria e subcategoria em dois <select> encadeados: escolhe a
 * categoria primeiro, e o de subcategoria aparece assim que ela é
 * escolhida (mesmo sem nenhuma ainda — o "+" ao lado cria uma na hora).
 * Selecionar uma subcategoria usa o id dela como categoria_id do
 * lançamento; sem isso, usa o id da categoria de topo mesmo. */
export function CategoriaSubcategoriaSelect({ categorias, value, onChange, tipo, onCategoriaCriada }: Props) {
  const topo = useMemo(() => categorias.filter((c) => !c.categoria_pai_id), [categorias]);
  const subcategoriasPorPai = useMemo(() => {
    const mapa = new Map<string, CategoriaRow[]>();
    for (const c of categorias) {
      if (!c.categoria_pai_id) continue;
      const lista = mapa.get(c.categoria_pai_id) ?? [];
      lista.push(c);
      mapa.set(c.categoria_pai_id, lista);
    }
    return mapa;
  }, [categorias]);

  const selecionada = categorias.find((c) => c.id === value);
  // Se o valor atual já é uma subcategoria, a categoria "de cima" é o pai dela.
  const topoId = selecionada?.categoria_pai_id ?? selecionada?.id ?? "";
  const topoSelecionada = topo.find((c) => c.id === topoId);
  const subDaCategoria = subcategoriasPorPai.get(topoId) ?? [];
  const subId = selecionada?.categoria_pai_id ? selecionada.id : SEM_SUBCATEGORIA;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <Label>Categoria</Label>
        <div className="flex gap-2">
          <Select value={topoId} onValueChange={onChange}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Escolha" />
            </SelectTrigger>
            <SelectContent>
              {topo.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {tipo && onCategoriaCriada && <CategoriaQuickCreate tipo={tipo} onCreated={onCategoriaCriada} />}
        </div>
      </div>

      {topoSelecionada && (
        <div className="space-y-2">
          <Label>Subcategoria</Label>
          <div className="flex gap-2">
            <Select
              value={subId}
              onValueChange={(v) => onChange(v === SEM_SUBCATEGORIA ? topoId : v)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_SUBCATEGORIA}>Nenhuma</SelectItem>
                {subDaCategoria.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {onCategoriaCriada && (
              <SubcategoriaQuickCreate categoriaPai={topoSelecionada} onCreated={onCategoriaCriada} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
