import Link from "next/link";
import { Download, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApagarLancamentoButton } from "@/features/lancamentos/apagar-lancamento-button";
import { LancamentoFormDialog } from "@/features/lancamentos/lancamento-form-dialog";
import { MarcarPagoDialog } from "@/features/lancamentos/marcar-pago-dialog";
import { getGruposComSubgrupos } from "@/lib/data/categorias";
import { buscarLancamentos, PAGE_SIZE } from "@/lib/data/lancamentos";
import { formatCurrency, formatDate } from "@/lib/format";
import { filtroLancamentosSchema } from "@/lib/validation/lancamentos";

export default async function LancamentosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const rawParams = await searchParams;
  const filtros = filtroLancamentosSchema.parse(rawParams);

  const [{ linhas, total }, grupos] = await Promise.all([
    buscarLancamentos(filtros),
    getGruposComSubgrupos(),
  ]);

  const nomeGrupo = new Map(grupos.map((g) => [g.id, g.nome]));
  const nomeSubgrupo = new Map(grupos.flatMap((g) => g.subgrupos.map((s) => [s.id, s.nome] as const)));
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paramsExport = new URLSearchParams(
    Object.entries(rawParams).filter(([, v]) => v) as [string, string][],
  ).toString();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Lançamentos</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/lancamentos/export${paramsExport ? `?${paramsExport}` : ""}`}>
              <Download className="size-4" /> Exportar CSV
            </Link>
          </Button>
          <LancamentoFormDialog
            grupos={grupos}
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> Novo lançamento
              </Button>
            }
          />
        </div>
      </div>

      {/* Form GET nativo: filtra sem precisar de JS no cliente. */}
      <form className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" method="get">
        <Input type="date" name="de" defaultValue={filtros.de} aria-label="De" />
        <Input type="date" name="ate" defaultValue={filtros.ate} aria-label="Até" />
        <select
          name="grupo_id"
          defaultValue={filtros.grupo_id ?? ""}
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
        >
          <option value="">Todo grupo</option>
          {grupos.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nome}
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
            <TableHead>Data</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Grupo</TableHead>
            <TableHead>Subgrupo</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Método</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((l) => (
            <TableRow key={l.id}>
              <TableCell>{formatDate(l.data_prevista)}</TableCell>
              <TableCell className="font-medium">{l.nome}</TableCell>
              <TableCell>{l.tipo === "entrada" ? "Entrada" : "Saída"}</TableCell>
              <TableCell>{nomeGrupo.get(l.grupo_id) ?? "—"}</TableCell>
              <TableCell>{l.subgrupo_id ? (nomeSubgrupo.get(l.subgrupo_id) ?? "—") : "—"}</TableCell>
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
                  grupos={grupos}
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
            const params = new URLSearchParams(
              Object.entries(rawParams).filter(([k, v]) => v && k !== "pagina") as [string, string][],
            );
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
