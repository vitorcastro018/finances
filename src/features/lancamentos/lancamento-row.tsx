"use client";

import { useState } from "react";

import { SituacaoBadge } from "@/components/ui/situacao-badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { AnexoLink } from "@/features/lancamentos/anexo-link";
import { ApagarLancamentoButton } from "@/features/lancamentos/apagar-lancamento-button";
import { LancamentoFormDialog } from "@/features/lancamentos/lancamento-form-dialog";
import { MarcarPagoDialog } from "@/features/lancamentos/marcar-pago-dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import { calcularSituacao } from "@/lib/situacao";
import type { CartaoRow, CategoriaRow, LancamentoRow as LancamentoRowData } from "@/lib/supabase/types";

/** Linha da tabela de /lancamentos — clicar em qualquer parte dela abre a
 * edição do lançamento, sem precisar de um botão "Editar" dedicado. Ações
 * (marcar pago, apagar) e o anexo escapam disso via stopPropagation, senão
 * clicar nelas também abriria a edição por baixo. */
export function LancamentoRow({
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
      <TableRow
        className="cursor-pointer"
        tabIndex={0}
        role="button"
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") setOpen(true);
        }}
      >
        <TableCell>
          <SituacaoBadge situacao={calcularSituacao(lancamento.pago, lancamento.data_prevista)} />
        </TableCell>
        <TableCell>{formatDate(lancamento.data_prevista)}</TableCell>
        <TableCell className="font-medium">
          <div className="flex items-center gap-1">
            <span className="truncate">{lancamento.nome}</span>
            {lancamento.anexo_path && (
              <span onClick={(e) => e.stopPropagation()}>
                <AnexoLink anexoPath={lancamento.anexo_path} nome={lancamento.anexo_nome} compact />
              </span>
            )}
          </div>
        </TableCell>
        <TableCell>{nomeCategoria.get(lancamento.categoria_id) ?? "—"}</TableCell>
        <TableCell>
          {formatCurrency(lancamento.valor_previsto)}
          {lancamento.valor_pago !== null && lancamento.valor_pago !== lancamento.valor_previsto && (
            <span className="ml-1 text-xs text-muted-foreground">(pago: {formatCurrency(lancamento.valor_pago)})</span>
          )}
        </TableCell>
        <TableCell>{lancamento.cartao_id ? (nomeCartao.get(lancamento.cartao_id) ?? "—") : (lancamento.metodo ?? "—")}</TableCell>
        <TableCell className="capitalize">{lancamento.origem}</TableCell>
        <TableCell className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <MarcarPagoDialog conta={lancamento} />
          <ApagarLancamentoButton id={lancamento.id} nome={lancamento.nome} />
        </TableCell>
      </TableRow>
      <LancamentoFormDialog categorias={categorias} cartoes={cartoes} lancamento={lancamento} open={open} onOpenChange={setOpen} />
    </>
  );
}
