"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { apagarCategoria } from "@/lib/actions/categorias";

export function ApagarCategoriaButton({ id, nome }: { id: string; nome: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Apagar a categoria "${nome}"?`)) return;
        startTransition(async () => {
          const result = await apagarCategoria(id);
          if (result.error) toast.error(result.error);
          else toast.success("Categoria apagada.");
        });
      }}
    >
      <Trash2 className="size-4" />
      <span className="sr-only">Apagar</span>
    </Button>
  );
}
