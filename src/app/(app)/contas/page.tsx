import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SituacaoBadge } from "@/components/ui/situacao-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MonthSwitcher } from "@/components/layout/month-switcher";
import { ContasFilters } from "@/features/contas/contas-filters";
import { LancamentoFormDialog } from "@/features/lancamentos/lancamento-form-dialog";
import { MarcarPagoDialog } from "@/features/lancamentos/marcar-pago-dialog";
import { getCategorias } from "@/lib/data/categorias";
import { formatCurrency, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { parseMonthRef } from "@/lib/timezone";
import type { ContaDoMesRow, Situacao } from "@/lib/supabase/types";

export default async function ContasPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; situacao?: Situacao; categoria?: string }>;
}) {
  const { ref, situacao, categoria } = await searchParams;
  const referencia = parseMonthRef(ref);

  const supabase = await createClient();
  const [{ data, error }, categorias] = await Promise.all([
    supabase.rpc("contas_do_mes", { referencia }),
    getCategorias(),
  ]);

  // `situacao` volta como `text` do banco; a função SQL só produz um dos três
  // valores de `Situacao`, então o cast é seguro.
  let contas = (error ? [] : (data ?? [])) as ContaDoMesRow[];
  if (situacao) contas = contas.filter((c) => c.situacao === situacao);
  if (categoria) contas = contas.filter((c) => c.categoria_id === categoria);

  const porCategoria = new Map<string, ContaDoMesRow[]>();
  for (const conta of [...contas].sort((a, b) => a.data_prevista.localeCompare(b.data_prevista))) {
    const lista = porCategoria.get(conta.categoria_nome) ?? [];
    lista.push(conta);
    porCategoria.set(conta.categoria_nome, lista);
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <MonthSwitcher referencia={referencia} />
        <LancamentoFormDialog
          categorias={categorias}
          dataPrevistaPadrao={referencia}
          trigger={
            <Button variant="secondary" size="sm">
              <Plus className="size-4" /> Conta avulsa deste mês
            </Button>
          }
        />
      </div>

      <ContasFilters categorias={categorias} />

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Não foi possível carregar as contas do mês: {error.message}
        </p>
      )}

      {porCategoria.size === 0 && !error && (
        <p className="text-sm text-muted-foreground">Nenhuma conta encontrada para este filtro.</p>
      )}

      {[...porCategoria.entries()].map(([nomeCategoria, itens]) => (
        <Card key={nomeCategoria}>
          <CardContent className="p-0">
            <div className="flex items-center gap-2 border-b p-4">
              <span className="size-2.5 rounded-full" style={{ background: itens[0].categoria_cor }} />
              <h2 className="font-medium">{nomeCategoria}</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((conta) => (
                  <TableRow key={conta.id}>
                    <TableCell className="font-medium">{conta.nome}</TableCell>
                    <TableCell>{formatDate(conta.data_prevista)}</TableCell>
                    <TableCell>
                      {formatCurrency(conta.valor_previsto)}
                      {conta.valor_pago !== null && conta.valor_pago !== conta.valor_previsto && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          (pago: {formatCurrency(conta.valor_pago)})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <SituacaoBadge situacao={conta.situacao} />
                    </TableCell>
                    <TableCell className="text-right">
                      <MarcarPagoDialog conta={conta} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
