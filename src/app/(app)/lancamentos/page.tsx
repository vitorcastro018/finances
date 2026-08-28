import Link from "next/link";
import { CreditCard, Download, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SituacaoBadge } from "@/components/ui/situacao-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApagarLancamentoButton } from "@/features/lancamentos/apagar-lancamento-button";
import { LancamentoFormDialog } from "@/features/lancamentos/lancamento-form-dialog";
import { MarcarPagoDialog } from "@/features/lancamentos/marcar-pago-dialog";
import { MesFilterSelect } from "@/features/lancamentos/mes-filter-select";
import { ParcelamentoFormDialog } from "@/features/lancamentos/parcelamento-form-dialog";
import { ordenarCategoriasParaSelect } from "@/lib/categorias";
import { getCategorias } from "@/lib/data/categorias";
import { buscarLancamentos, PAGE_SIZE } from "@/lib/data/lancamentos";
import { formatCurrency, formatDate } from "@/lib/format";
import { calcularSituacao } from "@/lib/situacao";
import { currentMonthRef, formatMonthOptionLabel, monthRefToParam, shiftMonthRef } from "@/lib/timezone";
import { filtroLancamentosSchema } from "@/lib/validation/lancamentos";

// 12 meses pra trás e 6 pra frente, a partir do mês atual — intervalo
// generoso o bastante pra achar qualquer lançamento recente sem virar uma
// lista infinita.
function opcoesDeMes(): { valor: string; rotulo: string }[] {
  const opcoes = [];
  for (let delta = -12; delta <= 6; delta++) {
    const ref = shiftMonthRef(currentMonthRef(), delta);
    opcoes.push({ valor: monthRefToParam(ref), rotulo: formatMonthOptionLabel(ref) });
  }
  return opcoes;
}

export default async function LancamentosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const rawParams = await searchParams;
  const filtros = filtroLancamentosSchema.parse(rawParams);

  const [{ linhas, total }, categorias] = await Promise.all([
    buscarLancamentos(filtros),
    getCategorias(),
  ]);

  const nomeCategoria = new Map(categorias.map((c) => [c.id, c.nome]));
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Reflete o mês já resolvido (com o default aplicado) de volta pro link de
  // export, mesmo que a URL original não tivesse "mes".
  const paramsExport = new URLSearchParams({
    ...Object.fromEntries(Object.entries(rawParams).filter(([, v]) => v)),
    mes: filtros.mes,
  }).toString();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Lançamentos</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/lancamentos/export?${paramsExport}`}>
              <Download className="size-4" /> Exportar CSV
            </Link>
          </Button>
          <ParcelamentoFormDialog
            categorias={categorias}
            trigger={
              <Button variant="secondary" size="sm">
                <CreditCard className="size-4" /> Parcelado
              </Button>
            }
          />
          <LancamentoFormDialog
            categorias={categorias}
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> Novo lançamento
              </Button>
            }
          />
        </div>
      </div>

      {/* Form GET nativo — filtra sem precisar de JS no cliente, exceto o
          select de mês, que já submete sozinho ao trocar (MesFilterSelect). */}
      <form className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" method="get">
        <MesFilterSelect valor={filtros.mes} opcoes={opcoesDeMes()} />
        <select
          name="categoria_id"
          defaultValue={filtros.categoria_id ?? ""}
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
        >
          <option value="">Toda categoria</option>
          {ordenarCategoriasParaSelect(categorias).map((opcao) => (
            <option key={opcao.id} value={opcao.id}>
              {opcao.label}
            </option>
          ))}
        </select>
        <select
          name="tipo"
          defaultValue={filtros.tipo ?? ""}
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
        >
          <option value="">Entrada/Saída</option>
          <option value="entrada">Entrada</option>
          <option value="saida">Saída</option>
        </select>
        <select
          name="pago"
          defaultValue={filtros.pago ?? ""}
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
        >
          <option value="">Pago/Não pago</option>
          <option value="true">Pago</option>
          <option value="false">Não pago</option>
        </select>
        <Input type="text" name="busca" defaultValue={filtros.busca} placeholder="Buscar…" className="col-span-2" />
        <Button type="submit" variant="secondary">
          Filtrar
        </Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Situação</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Método</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((l) => (
            <TableRow key={l.id}>
              <TableCell>
                <SituacaoBadge situacao={calcularSituacao(l.pago, l.data_prevista)} />
              </TableCell>
              <TableCell>{formatDate(l.data_prevista)}</TableCell>
              <TableCell className="font-medium">{l.nome}</TableCell>
              <TableCell>{l.tipo === "entrada" ? "Entrada" : "Saída"}</TableCell>
              <TableCell>{nomeCategoria.get(l.categoria_id) ?? "—"}</TableCell>
              <TableCell>
                {formatCurrency(l.valor_previsto)}
                {l.valor_pago !== null && l.valor_pago !== l.valor_previsto && (
                  <span className="ml-1 text-xs text-muted-foreground">(pago: {formatCurrency(l.valor_pago)})</span>
                )}
              </TableCell>
              <TableCell>{l.metodo ?? "—"}</TableCell>
              <TableCell className="capitalize">{l.origem}</TableCell>
              <TableCell className="flex justify-end gap-1">
                <MarcarPagoDialog conta={l} />
                <LancamentoFormDialog
                  categorias={categorias}
                  lancamento={l}
                  trigger={
                    <Button variant="ghost" size="sm">
                      Editar
                    </Button>
                  }
                />
                <ApagarLancamentoButton id={l.id} nome={l.nome} />
              </TableCell>
            </TableRow>
          ))}
          {linhas.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground">
                Nenhum lançamento encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((pagina) => {
            const params = new URLSearchParams({
              ...Object.fromEntries(Object.entries(rawParams).filter(([k, v]) => v && k !== "pagina")),
              mes: filtros.mes,
            });
            params.set("pagina", String(pagina));
            const ativo = pagina === filtros.pagina;
            return (
              <Link
                key={pagina}
                href={`/lancamentos?${params.toString()}`}
                className={ativo ? "font-semibold text-primary" : "text-muted-foreground"}
              >
                {pagina}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
