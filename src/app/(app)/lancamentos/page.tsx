import Link from "next/link";
import { CreditCard, Download, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FiltroSelect } from "@/features/lancamentos/filtro-select";
import { LancamentoCard } from "@/features/lancamentos/lancamento-card";
import { LancamentoFormDialog } from "@/features/lancamentos/lancamento-form-dialog";
import { LancamentoRow } from "@/features/lancamentos/lancamento-row";
import { MesFilterSelect } from "@/features/lancamentos/mes-filter-select";
import { ParcelamentoFormDialog } from "@/features/lancamentos/parcelamento-form-dialog";
import { ordenarCategoriasParaSelect } from "@/lib/categorias";
import { getCartoes } from "@/lib/data/cartoes";
import { getCategorias } from "@/lib/data/categorias";
import { buscarLancamentos } from "@/lib/data/lancamentos";
import { formatCurrency } from "@/lib/format";
import { currentMonthRef, formatMonthOptionLabel, monthRefToParam, shiftMonthRef } from "@/lib/timezone";
import { filtroLancamentosSchema, type ColunaOrdenavel, type FiltroLancamentos } from "@/lib/validation/lancamentos";
import type { CartaoRow, CategoriaRow, LancamentoRow as LancamentoRowData } from "@/lib/supabase/types";

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
  if (filtros.cartao_id) params.cartao_id = filtros.cartao_id;
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

function SecaoLancamentos({
  titulo,
  linhas,
  categorias,
  cartoes,
  nomeCategoria,
  nomeCartao,
  filtros,
  mensagemVazio,
}: {
  titulo: string;
  linhas: LancamentoRowData[];
  categorias: CategoriaRow[];
  cartoes: CartaoRow[];
  nomeCategoria: Map<string, string>;
  nomeCartao: Map<string, string>;
  filtros: FiltroLancamentos;
  mensagemVazio: string;
}) {
  const total = linhas.reduce((soma, l) => soma + l.valor_previsto, 0);

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground">{titulo}</h2>

      {/* Celular: cartões (a tabela de 8 colunas não cabe numa tela estreita). */}
      <div className="space-y-2 sm:hidden">
        {linhas.map((l) => (
          <LancamentoCard
            key={l.id}
            lancamento={l}
            categorias={categorias}
            cartoes={cartoes}
            nomeCategoria={nomeCategoria}
            nomeCartao={nomeCartao}
          />
        ))}
        {linhas.length === 0 && <p className="text-center text-sm text-muted-foreground">{mensagemVazio}</p>}
        {linhas.length > 0 && (
          <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3 text-sm font-medium">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        )}
      </div>

      {/* Desktop/tablet: tabela, com ordenação por coluna. */}
      <div className="hidden sm:block">
        <Table>
          <CabecalhoLancamentos filtros={filtros} />
          <TableBody>
            {linhas.map((l) => (
              <LancamentoRow
                key={l.id}
                lancamento={l}
                categorias={categorias}
                cartoes={cartoes}
                nomeCategoria={nomeCategoria}
                nomeCartao={nomeCartao}
              />
            ))}
            {linhas.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  {mensagemVazio}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {linhas.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4} className="text-right">
                  Total
                </TableCell>
                <TableCell>{formatCurrency(total)}</TableCell>
                <TableCell colSpan={3} />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
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

  const [linhas, categorias, cartoes] = await Promise.all([buscarLancamentos(filtros), getCategorias(), getCartoes()]);

  const nomeCategoria = new Map(categorias.map((c) => [c.id, c.nome]));
  const nomeCartao = new Map(cartoes.map((c) => [c.id, c.nome]));
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
          <Button asChild variant="outline" size="sm" aria-label="Exportar CSV">
            <Link href={`/lancamentos/export?${paramsExport}`}>
              <Download className="size-4" /> <span className="hidden sm:inline">Exportar CSV</span>
            </Link>
          </Button>
          <ParcelamentoFormDialog
            categorias={categorias}
            cartoes={cartoes}
            trigger={
              <Button variant="secondary" size="sm" aria-label="Parcelado">
                <CreditCard className="size-4" /> <span className="hidden sm:inline">Parcelado</span>
              </Button>
            }
          />
          <LancamentoFormDialog
            categorias={categorias}
            cartoes={cartoes}
            trigger={
              <Button size="sm" aria-label="Novo lançamento">
                <Plus className="size-4" /> <span className="hidden sm:inline">Novo lançamento</span>
              </Button>
            }
          />
        </div>
      </div>

      {/* Form GET nativo — filtra sem precisar de JS no cliente, exceto o
          select de mês, que já submete sozinho ao trocar (MesFilterSelect).
          ordenar/direcao vão como hidden pra sobreviver a filtrar de novo. */}
      <form className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7" method="get">
        <input type="hidden" name="ordenar" value={filtros.ordenar} />
        <input type="hidden" name="direcao" value={filtros.direcao} />
        <MesFilterSelect valor={filtros.mes} opcoes={opcoesDeMes()} />
        <FiltroSelect
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
        </FiltroSelect>
        <FiltroSelect
          name="tipo"
          defaultValue={filtros.tipo ?? ""}
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
        >
          <option value="">Entrada/Saída</option>
          <option value="entrada">Entrada</option>
          <option value="saida">Saída</option>
        </FiltroSelect>
        <FiltroSelect
          name="pago"
          defaultValue={filtros.pago ?? ""}
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
        >
          <option value="">Pago/Não pago</option>
          <option value="true">Pago</option>
          <option value="false">Não pago</option>
        </FiltroSelect>
        <FiltroSelect
          name="cartao_id"
          defaultValue={filtros.cartao_id ?? ""}
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
        >
          <option value="">Todo cartão</option>
          {cartoes.map((cartao) => (
            <option key={cartao.id} value={cartao.id}>
              {cartao.nome}
            </option>
          ))}
        </FiltroSelect>
        <Input type="text" name="busca" defaultValue={filtros.busca} placeholder="Buscar…" className="col-span-2" />
        <Button type="submit" variant="secondary" className="col-span-2 sm:col-span-1">
          Filtrar
        </Button>
      </form>

      <SecaoLancamentos
        titulo="Saídas"
        linhas={saidas}
        categorias={categorias}
        cartoes={cartoes}
        nomeCategoria={nomeCategoria}
        nomeCartao={nomeCartao}
        filtros={filtros}
        mensagemVazio="Nenhuma saída encontrada."
      />

      <SecaoLancamentos
        titulo="Entradas"
        linhas={entradas}
        categorias={categorias}
        cartoes={cartoes}
        nomeCategoria={nomeCategoria}
        nomeCartao={nomeCartao}
        filtros={filtros}
        mensagemVazio="Nenhuma entrada encontrada."
      />
    </div>
  );
}
