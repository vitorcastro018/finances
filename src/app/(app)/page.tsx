import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthSwitcher } from "@/components/layout/month-switcher";
import { GrupoBarChart, type GastoPorGrupo } from "@/features/dashboard/grupo-bar-chart";
import { MarcarPagoDialog } from "@/features/lancamentos/marcar-pago-dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { parseMonthRef } from "@/lib/timezone";
import type { ContaDoMesRow } from "@/lib/supabase/types";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const referencia = parseMonthRef(ref);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("contas_do_mes", { referencia });
  // `situacao` volta como `text` do banco; a função SQL só produz um dos três
  // valores de `Situacao`, então o cast é seguro.
  const contas = (error ? [] : (data ?? [])) as ContaDoMesRow[];

  const saidas = contas.filter((c) => c.tipo === "saida");
  const totalPrevisto = saidas.reduce((sum, c) => sum + c.valor_previsto, 0);
  const totalPago = saidas.filter((c) => c.pago).reduce((sum, c) => sum + (c.valor_pago ?? c.valor_previsto), 0);
  const itensFaltando = saidas.filter((c) => !c.pago).length;

  const entradasEfetivadas = contas
    .filter((c) => c.tipo === "entrada" && c.pago)
    .reduce((sum, c) => sum + (c.valor_pago ?? c.valor_previsto), 0);
  const saldoDoMes = entradasEfetivadas - totalPago;

  const gastoPorGrupo = new Map<string, GastoPorGrupo>();
  for (const conta of saidas) {
    const atual = gastoPorGrupo.get(conta.grupo_nome) ?? {
      grupo: conta.grupo_nome,
      cor: conta.grupo_cor,
      total: 0,
    };
    atual.total += conta.valor_previsto;
    gastoPorGrupo.set(conta.grupo_nome, atual);
  }

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
            <CardTitle>Saldo do mês</CardTitle>
          </CardHeader>
          <CardContent
            className={`text-xl font-semibold ${saldoDoMes < 0 ? "text-destructive" : "text-success"}`}
          >
            {formatCurrency(saldoDoMes)}
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
          <CardTitle>Gasto por grupo</CardTitle>
        </CardHeader>
        <CardContent>
          <GrupoBarChart dados={[...gastoPorGrupo.values()]} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Próximos vencimentos</CardTitle>
          <Button asChild variant="link" size="sm" className="h-auto p-0">
            <Link href="/contas">Ver todas</Link>
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
    </div>
  );
}
