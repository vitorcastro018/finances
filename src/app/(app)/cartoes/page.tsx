import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlternarAtivoSwitch } from "@/features/cartoes/alternar-ativo-switch";
import { CartaoFormDialog } from "@/features/cartoes/cartao-form-dialog";
import { getCartoes } from "@/lib/data/cartoes";

export default async function CartoesPage() {
  const cartoes = await getCartoes();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Cartões</h1>
        <CartaoFormDialog
          trigger={
            <Button size="sm" aria-label="Novo cartão">
              <Plus className="size-4" /> <span className="hidden sm:inline">Novo cartão</span>
            </Button>
          }
        />
      </div>

      {cartoes.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum cartão ainda. Crie um (ex.: &quot;Nubank&quot;) pra escolher no momento de lançar uma compra no
          crédito.
        </p>
      )}

      {/* Celular: um card por cartão de crédito cadastrado. */}
      <div className="space-y-2 sm:hidden">
        {cartoes.map((cartao) => (
          <div key={cartao.id} className="rounded-lg border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{cartao.nome}</p>
                <p className="truncate text-xs text-muted-foreground">
                  Fecha dia {cartao.dia_fechamento} · vence dia {cartao.dia_vencimento}
                </p>
              </div>
              <AlternarAtivoSwitch id={cartao.id} ativo={cartao.ativo} />
            </div>
            <div className="mt-3 flex justify-end border-t pt-2">
              <CartaoFormDialog
                cartao={cartao}
                trigger={
                  <Button variant="ghost" size="sm">
                    Editar
                  </Button>
                }
              />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop/tablet: tabela. */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Fechamento</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cartoes.map((cartao) => (
              <TableRow key={cartao.id}>
                <TableCell className="font-medium">{cartao.nome}</TableCell>
                <TableCell>Dia {cartao.dia_fechamento}</TableCell>
                <TableCell>Dia {cartao.dia_vencimento}</TableCell>
                <TableCell>
                  <AlternarAtivoSwitch id={cartao.id} ativo={cartao.ativo} />
                </TableCell>
                <TableCell className="text-right">
                  <CartaoFormDialog
                    cartao={cartao}
                    trigger={
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
