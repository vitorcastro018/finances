"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { apagarLancamento } from "@/lib/actions/lancamentos";

export function ApagarLancamentoButton({ id, nome }: { id: string; nome: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Apagar "${nome}"? Essa ação não pode ser desfeita.`)) return;
        startTransition(async () => {
          const result = await apagarLancamento(id);
          if (result.error) toast.error(result.error);
          else toast.success("Lançamento apagado.");
        });
      }}
    >
      <Trash2 className="size-4" />
      <span className="sr-only">Apagar</span>
    </Button>
  );
}
