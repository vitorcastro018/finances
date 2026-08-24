"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { alternarAtivaContaFixa } from "@/lib/actions/contas-fixas";

export function AlternarAtivaSwitch({ id, ativa }: { id: string; ativa: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox
        checked={ativa}
        disabled={pending}
        onCheckedChange={(value) => {
          startTransition(async () => {
            const result = await alternarAtivaContaFixa(id, value === true);
            if (result.error) toast.error(result.error);
            else toast.success(value ? "Conta fixa ativada." : "Conta fixa desativada.");
          });
        }}
      />
      {ativa ? "Ativa" : "Inativa"}
    </label>
  );
}
