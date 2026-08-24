"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { apagarGrupo, apagarSubgrupo } from "@/lib/actions/categorias";

type Props = { id: string; nome: string; tipo: "grupo" | "subgrupo" };

export function ApagarCategoriaButton({ id, nome, tipo }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Apagar o ${tipo} "${nome}"?`)) return;
        startTransition(async () => {
          const result = tipo === "grupo" ? await apagarGrupo(id) : await apagarSubgrupo(id);
          if (result.error) toast.error(result.error);
          else toast.success(`${tipo === "grupo" ? "Grupo" : "Subgrupo"} apagado.`);
        });
      }}
    >
      <Trash2 className="size-4" />
      <span className="sr-only">Apagar</span>
    </Button>
  );
}
