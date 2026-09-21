"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { alternarAtivoCartao } from "@/lib/actions/cartoes";

export function AlternarAtivoSwitch({ id, ativo }: { id: string; ativo: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox
        checked={ativo}
        disabled={pending}
        onCheckedChange={(value) => {
          startTransition(async () => {
            const result = await alternarAtivoCartao(id, value === true);
            if (result.error) toast.error(result.error);
            else toast.success(value ? "Cartão ativado." : "Cartão desativado.");
          });
        }}
      />
      {ativo ? "Ativo" : "Inativo"}
    </label>
  );
}
