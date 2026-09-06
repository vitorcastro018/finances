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
import { buscarLancamentos } from "@/lib/data/lancamentos";
import { formatCurrency, formatDate } from "@/lib/format";
import { calcularSituacao } from "@/lib/situacao";
import { currentMonthRef, formatMonthOptionLabel, monthRefToParam, shiftMonthRef } from "@/lib/timezone";
import { filtroLancamentosSchema, type ColunaOrdenavel, type FiltroLancamentos } from "@/lib/validation/lancamentos";
import type { CategoriaRow, LancamentoRow } from "@/lib/supabase/types";

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

/** Os filtros que devem sobreviver ao clicar num cabeçalho de coluna
 * (a página sempre volta pra 1 ao reordenar). */
function paramsDosFiltros(filtros: FiltroLancamentos): Record<string, string> {
  const params: Record<string, string> = { mes: filtros.mes };
  if (filtros.categoria_id) params.categoria_id = filtros.categoria_id;
  if (filtros.tipo) params.tipo = filtros.tipo;
  if (filtros.pago) params.pago = filtros.pago;
  if (filtros.busca) params.busca = filtros.busca;
  return params;
}

function linkOrdenar(filtros: FiltroLancamentos, coluna: ColunaOrdenavel): string {
  const mesmaColuna = filtros.ordenar === coluna;
  const novaDirecao = mesmaColuna && filtros.direcao === "asc" ? "desc" : "asc";
  const params = new URLSearchParams({ ...paramsDosFiltros(filtros), ordenar: coluna, direcao: novaDirecao });
  return `/lancamentos?${params.toString()}`;
}

function ColunaHead({
  filtros,
  coluna,
  label,
  className,
}: {
  filtros: FiltroLancamentos;
  coluna: ColunaOrdenavel;
  label: string;
  className?: string;
}) {
  const ativa = filtros.ordenar === coluna;
  return (
    <TableHead className={className}>
      <Link href={linkOrdenar(filtros, coluna)} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}
        {ativa && <span aria-hidden>{filtros.direcao === "asc" ? "▲" : "▼"}</span>}
      </Link>
    </TableHead>
  );
}

function CabecalhoLancamentos({ filtros }: { filtros: FiltroLancamentos }) {
  return (
    <TableHeader>
      <TableRow>
        <ColunaHead filtros={filtros} coluna="situacao" label="Situação" />
        <ColunaHead filtros={filtros} coluna="data" label="Data" />
        <ColunaHead filtros={filtros} coluna="nome" label="Nome" />
        <ColunaHead filtros={filtros} coluna="categoria" label="Categoria" />
        <ColunaHead filtros={filtros} coluna="valor" label="Valor" />
        <ColunaHead filtros={filtros} coluna="metodo" label="Método" />
        <ColunaHead filtros={filtros} coluna="origem" label="Origem" />
        <TableHead className="text-right">Ações</TableHead>
      </TableRow>
    </TableHeader>
  );
}

function LinhaLancamento({
  lancamento,
  categorias,
  nomeCategoria,
}: {
  lancamento: LancamentoRow;
  categorias: CategoriaRow[];
  nomeCategoria: Map<string, string>;
}) {
  return (
    <TableRow>
      <TableCell>
        <SituacaoBadge situacao={calcularSituacao(lancamento.pago, lancamento.data_prevista)} />
      </TableCell>
      <TableCell>{formatDate(lancamento.data_prevista)}</TableCell>
      <TableCell className="font-medium">{lancamento.nome}</TableCell>
      <TableCell>{nomeCategoria.get(lancamento.categoria_id) ?? "—"}</TableCell>
      <TableCell>
        {formatCurrency(lancamento.valor_previsto)}
        {lancamento.valor_pago !== null && lancamento.valor_pago !== lancamento.valor_previsto && (
          <span className="ml-1 text-xs text-muted-foreground">(pago: {formatCurrency(lancamento.valor_pago)})</span>
        )}
      </TableCell>
      <TableCell>{lancamento.metodo ?? "—"}</TableCell>
      <TableCell className="capitalize">{lancamento.origem}</TableCell>
      <TableCell className="flex justify-end gap-1">
        <MarcarPagoDialog conta={lancamento} />
        <LancamentoFormDialog
          categorias={categorias}
          lancamento={lancamento}
          trigger={
            <Button variant="ghost" size="sm">
              Editar
            </Button>
          }
        />
        <ApagarLancamentoButton id={lancamento.id} nome={lancamento.nome} />
      </TableCell>
    </TableRow>
  );
}

function SecaoLancamentos({
  titulo,
  linhas,
  categorias,
  nomeCategoria,
  filtros,
  mensagemVazio,
}: {
  titulo: string;
  linhas: LancamentoRow[];
  categorias: CategoriaRow[];
  nomeCategoria: Map<string, string>;
  filtros: FiltroLancamentos;
  mensagemVazio: string;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground">{titulo}</h2>
      <Table>
        <CabecalhoLancamentos filtros={filtros} />
        <TableBody>
          {linhas.map((l) => (
            <LinhaLancamento key={l.id} lancamento={l} categorias={categorias} nomeCategoria={nomeCategoria} />
          ))}
          {linhas.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                {mensagemVazio}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default async function LancamentosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const rawParams = await searchParams;
  const filtros = filtroLancamentosSchema.parse(rawParams);

  const [linhas, categorias] = await Promise.all([buscarLancamentos(filtros), getCategorias()]);

  const nomeCategoria = new Map(categorias.map((c) => [c.id, c.nome]));
  // "categoria" não é uma coluna da tabela (é o nome da categoria ligada) —
  // pedir isso ao banco exigiria um join só pra ordenar; mais simples
  // reordenar aqui, já com os nomes resolvidos. Só afeta a página atual,
  // não a lista inteira — suficiente pro tamanho de página deste MVP.
  const linhasOrdenadas =
    filtros.ordenar === "categoria"
      ? [...linhas].sort((a, b) => {
          const nomeA = nomeCategoria.get(a.categoria_id) ?? "";
          const nomeB = nomeCategoria.get(b.categoria_id) ?? "";
          return nomeA.localeCompare(nomeB) * (filtros.direcao === "asc" ? 1 : -1);
        })
      : linhas;

  const saidas = linhasOrdenadas.filter((l) => l.tipo === "saida");
  const entradas = linhasOrdenadas.filter((l) => l.tipo === "entrada");

  // Reflete o mês já resolvido (com o default aplicado) de volta pro link de
  // export, mesmo que a URL original não tivesse "mes".
  const paramsExport = new URLSearchParams({
    ...Object.fromEntries(Object.entries(rawParams).filter(([, v]) => v)),
    mes: filtros.mes,
  }).toString();

  return (
    <div className="space-y-8 p-4 sm:p-6">
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
          select de mês, que já submete sozinho ao trocar (MesFilterSelect).
          ordenar/direcao vão como hidden pra sobreviver a filtrar de novo. */}
      <form className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" method="get">
        <input type="hidden" name="ordenar" value={filtros.ordenar} />
        <input type="hidden" name="direcao" value={filtros.direcao} />
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

      <SecaoLancamentos
        titulo="Saídas"
        linhas={saidas}
        categorias={categorias}
        nomeCategoria={nomeCategoria}
        filtros={filtros}
        mensagemVazio="Nenhuma saída encontrada."
      />

      <SecaoLancamentos
        titulo="Entradas"
        linhas={entradas}
        categorias={categorias}
        nomeCategoria={nomeCategoria}
        filtros={filtros}
        mensagemVazio="Nenhuma entrada encontrada."
      />
    </div>
  );
}
