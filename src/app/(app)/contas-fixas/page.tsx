import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlternarAtivaSwitch } from "@/features/contas-fixas/alternar-ativa-switch";
import { ContaFixaFormDialog } from "@/features/contas-fixas/conta-fixa-form-dialog";
import { GerarPrevistosButton } from "@/features/contas-fixas/gerar-previstos-button";
import { getGruposComSubgrupos } from "@/lib/data/categorias";
import { getContasFixas } from "@/lib/data/contas-fixas";
import { formatCurrency } from "@/lib/format";
import { currentMonthRef } from "@/lib/timezone";

export default async function ContasFixasPage() {
  const [contasFixas, grupos] = await Promise.all([getContasFixas(), getGruposComSubgrupos()]);
  const nomeSubgrupo = new Map(
    grupos.flatMap((g) => g.subgrupos.map((s) => [s.id, `${g.nome} › ${s.nome}`] as const)),
  );

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Contas fixas</h1>
        <div className="flex gap-2">
          <GerarPrevistosButton referencia={currentMonthRef()} />
          <ContaFixaFormDialog
            grupos={grupos}
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> Nova conta fixa
              </Button>
            }
          />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Subgrupo</TableHead>
            <TableHead>Valor previsto</TableHead>
            <TableHead>Dia de vencimento</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead className="text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contasFixas.map((cf) => (
            <TableRow key={cf.id}>
              <TableCell className="font-medium">{cf.nome}</TableCell>
              <TableCell>{nomeSubgrupo.get(cf.subgrupo_id) ?? "—"}</TableCell>
              <TableCell>{cf.valor_previsto === null ? "Variável" : formatCurrency(cf.valor_previsto)}</TableCell>
              <TableCell>Dia {cf.dia_vencimento}</TableCell>
              <TableCell>
                <AlternarAtivaSwitch id={cf.id} ativa={cf.ativa} />
              </TableCell>
              <TableCell className="text-right">
                <ContaFixaFormDialog
                  grupos={grupos}
                  contaFixa={cf}
                  trigger={
                    <Button variant="ghost" size="sm">
                      Editar
                    </Button>
                  }
                />
              </TableCell>
            </TableRow>
          ))}
          {contasFixas.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhuma conta fixa cadastrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
