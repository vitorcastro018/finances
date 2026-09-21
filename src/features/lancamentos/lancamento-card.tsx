"use client";

import { useState } from "react";

import { SituacaoBadge } from "@/components/ui/situacao-badge";
import { AnexoLink } from "@/features/lancamentos/anexo-link";
import { ApagarLancamentoButton } from "@/features/lancamentos/apagar-lancamento-button";
import { LancamentoFormDialog } from "@/features/lancamentos/lancamento-form-dialog";
import { MarcarPagoDialog } from "@/features/lancamentos/marcar-pago-dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import { calcularSituacao } from "@/lib/situacao";
import type { CartaoRow, CategoriaRow, LancamentoRow as LancamentoRowData } from "@/lib/supabase/types";

/** Versão em cartão da mesma linha, só pro celular — uma tabela de 8
 * colunas não cabe numa tela estreita sem virar uma rolagem lateral
 * ilegível. Clicar em qualquer parte do cartão abre a edição do
 * lançamento, sem precisar de um botão "Editar" dedicado; ações (marcar
 * pago, apagar) e o anexo escapam disso via stopPropagation. */
export function LancamentoCard({
  lancamento,
  categorias,
  cartoes,
  nomeCategoria,
  nomeCartao,
}: {
  lancamento: LancamentoRowData;
  categorias: CategoriaRow[];
  cartoes: CartaoRow[];
  nomeCategoria: Map<string, string>;
  nomeCartao: Map<string, string>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="cursor-pointer rounded-lg border bg-card p-3"
        tabIndex={0}
        role="button"
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") setOpen(true);
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <p className="truncate font-medium">{lancamento.nome}</p>
              {lancamento.anexo_path && (
                <span onClick={(e) => e.stopPropagation()}>
                  <AnexoLink anexoPath={lancamento.anexo_path} nome={lancamento.anexo_nome} compact />
                </span>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {nomeCategoria.get(lancamento.categoria_id) ?? "—"} · {formatDate(lancamento.data_prevista)}
            </p>
          </div>
          <SituacaoBadge situacao={calcularSituacao(lancamento.pago, lancamento.data_prevista)} />
        </div>
        <div className="mt-2 flex items-end justify-between gap-2">
          <div>
            <p className="text-lg font-semibold">{formatCurrency(lancamento.valor_previsto)}</p>
            {lancamento.valor_pago !== null && lancamento.valor_pago !== lancamento.valor_previsto && (
              <p className="text-xs text-muted-foreground">pago: {formatCurrency(lancamento.valor_pago)}</p>
            )}
          </div>
          <p className="text-right text-xs text-muted-foreground capitalize">
            {lancamento.cartao_id ? (nomeCartao.get(lancamento.cartao_id) ?? "—") : (lancamento.metodo ?? "—")} ·{" "}
            {lancamento.origem}
          </p>
        </div>
        <div className="mt-3 flex justify-end gap-1 border-t pt-2" onClick={(e) => e.stopPropagation()}>
          <MarcarPagoDialog conta={lancamento} />
          <ApagarLancamentoButton id={lancamento.id} nome={lancamento.nome} />
        </div>
      </div>
      <LancamentoFormDialog categorias={categorias} cartoes={cartoes} lancamento={lancamento} open={open} onOpenChange={setOpen} />
    </>
  );
}
