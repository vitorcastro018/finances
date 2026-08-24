"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { gerarPrevistosDoMes } from "@/lib/actions/contas-fixas";

export function GerarPrevistosButton({ referencia }: { referencia: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await gerarPrevistosDoMes(referencia);
          if (result.error) toast.error(result.error);
          else if (result.geradas === 0) toast.info("Nada novo — os previstos deste mês já existiam.");
          else toast.success(`${result.geradas} conta(s) gerada(s) para este mês.`);
        })
      }
    >
      <RefreshCw className="size-4" />
      Gerar previstos deste mês
    </Button>
  );
}
