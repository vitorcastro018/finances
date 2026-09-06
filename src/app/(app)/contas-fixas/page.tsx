import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlternarAtivaSwitch } from "@/features/contas-fixas/alternar-ativa-switch";
import { ContaFixaFormDialog } from "@/features/contas-fixas/conta-fixa-form-dialog";
import { GerarPrevistosButton } from "@/features/contas-fixas/gerar-previstos-button";
import { getCategorias } from "@/lib/data/categorias";
import { getContasFixas } from "@/lib/data/contas-fixas";
import { formatCurrency } from "@/lib/format";
import type { CategoriaRow, ContaFixaRow } from "@/lib/supabase/types";

function TabelaContasFixas({
  contasFixas,
  categorias,
  nomeCategoria,
  mensagemVazio,
}: {
  contasFixas: ContaFixaRow[];
  categorias: CategoriaRow[];
  nomeCategoria: Map<string, string>;
  mensagemVazio: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Categoria</TableHead>
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
            <TableCell>{nomeCategoria.get(cf.categoria_id) ?? "—"}</TableCell>
            <TableCell>{cf.valor_previsto === null ? "Variável" : formatCurrency(cf.valor_previsto)}</TableCell>
            <TableCell>Dia {cf.dia_vencimento}</TableCell>
            <TableCell>
              <AlternarAtivaSwitch id={cf.id} ativa={cf.ativa} />
            </TableCell>
            <TableCell className="text-right">
              <ContaFixaFormDialog
                categorias={categorias}
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
              {mensagemVazio}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

export default async function ContasFixasPage() {
  const [contasFixas, categorias] = await Promise.all([getContasFixas(), getCategorias()]);
  const nomeCategoria = new Map(categorias.map((c) => [c.id, c.nome] as const));
  const categoriaPorId = new Map(categorias.map((c) => [c.id, c] as const));

  // contas_fixas não tem coluna própria de tipo — o tipo vem da categoria
  // ligada (mesma regra de gerar_previstos_do_mes() no banco).
  const saidas = contasFixas.filter((cf) => categoriaPorId.get(cf.categoria_id)?.tipo !== "entrada");
  const entradas = contasFixas.filter((cf) => categoriaPorId.get(cf.categoria_id)?.tipo === "entrada");

  return (
    <div className="space-y-8 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Contas fixas</h1>
        <div className="flex gap-2">
          <GerarPrevistosButton />
          <ContaFixaFormDialog
            categorias={categorias}
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> Nova conta fixa
              </Button>
            }
          />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Saídas fixas</h2>
        <TabelaContasFixas
          contasFixas={saidas}
          categorias={categorias}
          nomeCategoria={nomeCategoria}
          mensagemVazio="Nenhuma saída fixa cadastrada."
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Entradas fixas</h2>
        <TabelaContasFixas
          contasFixas={entradas}
          categorias={categorias}
          nomeCategoria={nomeCategoria}
          mensagemVazio="Nenhuma entrada fixa cadastrada. Ex.: Salário."
        />
      </div>
    </div>
  );
}
