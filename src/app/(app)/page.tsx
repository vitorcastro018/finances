import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthSwitcher } from "@/components/layout/month-switcher";
import { CategoriaBarChart, type ValorPorCategoria } from "@/features/dashboard/categoria-bar-chart";
import { EvolucaoMensalChart } from "@/features/dashboard/evolucao-mensal-chart";
import { MarcarPagoDialog } from "@/features/lancamentos/marcar-pago-dialog";
import { getCategorias } from "@/lib/data/categorias";
import { getEvolucaoMensal, getParcelamentosAbertos } from "@/lib/data/lancamentos";
import { formatCurrency, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { parseMonthRef } from "@/lib/timezone";
import type { CategoriaRow, ContaDoMesRow } from "@/lib/supabase/types";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const referencia = parseMonthRef(ref);

  const supabase = await createClient();
  const [{ data, error }, parcelamentos, categorias, evolucaoMensal] = await Promise.all([
    supabase.rpc("contas_do_mes", { referencia }),
    getParcelamentosAbertos(),
    getCategorias(),
    getEvolucaoMensal(referencia),
  ]);
  const categoriaPorId = new Map(categorias.map((c) => [c.id, c]));
  // `contas_do_mes` devolve a categoria exata do lançamento — pode já ser
  // uma subcategoria. Pra agrupar o gráfico principal pela categoria "mãe",
  // resolve o topo aqui; sem pai, a própria categoria já é o topo.
  function resolverTopo(categoriaId: string): CategoriaRow | undefined {
    const categoria = categoriaPorId.get(categoriaId);
    if (!categoria) return undefined;
    if (!categoria.categoria_pai_id) return categoria;
    return categoriaPorId.get(categoria.categoria_pai_id) ?? categoria;
  }
  // `situacao` volta como `text` do banco; a função SQL só produz um dos três
  // valores de `Situacao`, então o cast é seguro.
  const contas = (error ? [] : (data ?? [])) as ContaDoMesRow[];

  const saidas = contas.filter((c) => c.tipo === "saida");
  const totalPrevisto = saidas.reduce((sum, c) => sum + c.valor_previsto, 0);
  const totalPago = saidas.filter((c) => c.pago).reduce((sum, c) => sum + (c.valor_pago ?? c.valor_previsto), 0);
  const itensFaltando = saidas.filter((c) => !c.pago).length;

  const entradas = contas.filter((c) => c.tipo === "entrada");
  const totalPrevistoReceber = entradas.reduce((sum, c) => sum + c.valor_previsto, 0);
  const totalRecebido = entradas.filter((c) => c.pago).reduce((sum, c) => sum + (c.valor_pago ?? c.valor_previsto), 0);
  const saldoDoMes = totalRecebido - totalPago;
  // Tudo previsto de entrada menos tudo previsto de saída, sem esperar nada
  // ser marcado como pago/recebido — "se tudo acontecer como esperado".
  const saldoPrevisto = totalPrevistoReceber - totalPrevisto;

  // Agregado pela categoria "mãe" — sem isso, cada subcategoria virava uma
  // barra própria, fragmentando o gráfico principal. Mesma lógica pras duas
  // pontas (saída = gasto, entrada = receita), só trocando a lista de base.
  function agruparPorCategoria(lista: ContaDoMesRow[]): Map<string, ValorPorCategoria> {
    const porCategoria = new Map<string, ValorPorCategoria>();
    for (const conta of lista) {
      const topo = resolverTopo(conta.categoria_id);
      const chave = topo?.id ?? conta.categoria_id;
      const atual = porCategoria.get(chave) ?? {
        categoria: topo?.nome ?? conta.categoria_nome,
        cor: topo?.cor ?? conta.categoria_cor,
        total: 0,
      };
      atual.total += conta.valor_previsto;
      porCategoria.set(chave, atual);
    }
    return porCategoria;
  }

  // Só as contas lançadas numa subcategoria de verdade — mostra o detalhe
  // que o gráfico por categoria esconde ao agregar no topo.
  function agruparPorSubcategoria(lista: ContaDoMesRow[]): Map<string, ValorPorCategoria> {
    const porSubcategoria = new Map<string, ValorPorCategoria>();
    for (const conta of lista) {
      const categoria = categoriaPorId.get(conta.categoria_id);
      if (!categoria?.categoria_pai_id) continue;
      const pai = categoriaPorId.get(categoria.categoria_pai_id);
      const atual = porSubcategoria.get(categoria.id) ?? {
        categoria: pai ? `${pai.nome} › ${categoria.nome}` : categoria.nome,
        cor: categoria.cor,
        total: 0,
      };
      atual.total += conta.valor_previsto;
      porSubcategoria.set(categoria.id, atual);
    }
    return porSubcategoria;
  }

  const gastoPorCategoria = agruparPorCategoria(saidas);
  const gastoPorSubcategoria = agruparPorSubcategoria(saidas);
  const receitaPorCategoria = agruparPorCategoria(entradas);
  const receitaPorSubcategoria = agruparPorSubcategoria(entradas);

  const proximosVencimentos = contas
    .filter((c) => !c.pago)
    .sort((a, b) => a.data_prevista.localeCompare(b.data_prevista))
    .slice(0, 5);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <MonthSwitcher referencia={referencia} />

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Não foi possível carregar os dados do mês: {error.message}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Previsto a pagar</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">{formatCurrency(totalPrevisto)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Já pago</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">{formatCurrency(totalPago)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Previsto a receber</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">{formatCurrency(totalPrevistoReceber)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Já recebido</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">{formatCurrency(totalRecebido)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Saldo previsto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-xl font-semibold ${saldoPrevisto < 0 ? "text-destructive" : "text-success"}`}>
              {formatCurrency(saldoPrevisto)}
            </p>
            <p className="text-xs text-muted-foreground">Tudo previsto, pago ou não</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Saldo do mês</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-xl font-semibold ${saldoDoMes < 0 ? "text-destructive" : "text-success"}`}>
              {formatCurrency(saldoDoMes)}
            </p>
            <p className="text-xs text-muted-foreground">Só o que já foi pago/recebido</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Faltam pagar</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">{itensFaltando}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entradas x saídas — últimos 6 meses</CardTitle>
        </CardHeader>
        <CardContent>
          <EvolucaoMensalChart dados={evolucaoMensal} />
        </CardContent>
      </Card>

      {/* Saída e entrada sempre em colunas separadas — nunca no mesmo
          gráfico, pra não misturar as duas pontas. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground">Saídas</h2>
          <Card>
            <CardHeader>
              <CardTitle>Gasto por categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoriaBarChart dados={[...gastoPorCategoria.values()]} mensagemVazio="Nenhum gasto neste mês." />
            </CardContent>
          </Card>

          {gastoPorSubcategoria.size > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Gasto por subcategoria</CardTitle>
              </CardHeader>
              <CardContent>
                <CategoriaBarChart dados={[...gastoPorSubcategoria.values()]} />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground">Entradas</h2>
          <Card>
            <CardHeader>
              <CardTitle>Receita por categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoriaBarChart
                dados={[...receitaPorCategoria.values()]}
                mensagemVazio="Nenhuma receita neste mês."
              />
            </CardContent>
          </Card>

          {receitaPorSubcategoria.size > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Receita por subcategoria</CardTitle>
              </CardHeader>
              <CardContent>
                <CategoriaBarChart dados={[...receitaPorSubcategoria.values()]} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Próximos vencimentos</CardTitle>
          <Button asChild variant="link" size="sm" className="h-auto p-0">
            <Link href="/lancamentos">Ver todos</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {proximosVencimentos.length === 0 && (
            <p className="text-sm text-muted-foreground">Nada pendente neste mês. 🎉</p>
          )}
          {proximosVencimentos.map((conta) => (
            <div
              key={conta.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{conta.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(conta.data_prevista)} · {formatCurrency(conta.valor_previsto)}
                  {conta.situacao === "atrasado" && (
                    <Badge variant="destructive" className="ml-2">
                      Atrasado
                    </Badge>
                  )}
                </p>
              </div>
              <MarcarPagoDialog conta={conta} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Parcelamentos em aberto</CardTitle>
          <Button asChild variant="link" size="sm" className="h-auto p-0">
            <Link href="/lancamentos">Ver lançamentos</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {parcelamentos.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma compra parcelada em aberto.</p>
          )}
          {parcelamentos.map((p) => (
            <div
              key={p.parcelamento_id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{p.nome}</p>
                <p className="text-xs text-muted-foreground">
                  Faltam {p.parcela_total - p.parcelas_pagas} de {p.parcela_total} · próxima{" "}
                  {formatDate(p.proxima_data)} · {formatCurrency(p.valor_parcela)}
                </p>
              </div>
              <span className="text-sm font-medium">{formatCurrency(p.valor_restante)} restantes</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
