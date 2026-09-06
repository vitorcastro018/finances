"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { gerarPrevistosDoMes } from "@/lib/actions/contas-fixas";
import { currentMonthRef, formatMonthOptionLabel, monthRefToParam, shiftMonthRef } from "@/lib/timezone";

// Mês atual + 11 meses à frente — dá pra gerar os previstos com
// antecedência (ex.: fim de ano) sem virar uma lista infinita.
function opcoesDeMes(): { valor: string; rotulo: string }[] {
  const opcoes = [];
  for (let delta = 0; delta <= 11; delta++) {
    const ref = shiftMonthRef(currentMonthRef(), delta);
    opcoes.push({ valor: monthRefToParam(ref), rotulo: formatMonthOptionLabel(ref) });
  }
  return opcoes;
}

export function GerarPrevistosButton() {
  const opcoes = opcoesDeMes();
  const [mes, setMes] = useState(opcoes[0].valor);
  const [pending, startTransition] = useTransition();

  function gerar() {
    startTransition(async () => {
      const referencia = `${mes}-01`;
      const rotulo = opcoes.find((o) => o.valor === mes)?.rotulo ?? mes;
      const result = await gerarPrevistosDoMes(referencia);
      if (result.error) toast.error(result.error);
      else if (result.geradas === 0) toast.info(`Nada novo — os previstos de ${rotulo} já existiam.`);
      else toast.success(`${result.geradas} conta(s) gerada(s) para ${rotulo}.`);
    });
  }

  return (
    <div className="flex gap-2">
      <select
        value={mes}
        onChange={(e) => setMes(e.target.value)}
        className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
      >
        {opcoes.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </select>
      <Button variant="outline" disabled={pending} onClick={gerar}>
        <RefreshCw className="size-4" />
        Gerar previstos
      </Button>
    </div>
  );
}
