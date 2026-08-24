"use client";

import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { criarSubgrupo, editarSubgrupo } from "@/lib/actions/categorias";
import type { SubgrupoRow } from "@/lib/supabase/types";

type Props = { trigger: ReactNode; grupoId: string; subgrupo?: SubgrupoRow };

export function SubgrupoFormDialog({ trigger, grupoId, subgrupo }: Props) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(subgrupo?.nome ?? "");
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | undefined>();

  function submeter() {
    setErro(undefined);
    startTransition(async () => {
      const result = subgrupo
        ? await editarSubgrupo(subgrupo.id, nome)
        : await criarSubgrupo({ grupo_id: grupoId, nome });
      if (result.error) {
        setErro(result.error);
        return;
      }
      toast.success(subgrupo ? "Subgrupo atualizado." : "Subgrupo criado.");
      setOpen(false);
      if (!subgrupo) setNome("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{subgrupo ? "Editar subgrupo" : "Novo subgrupo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="nome-subgrupo">Nome</Label>
          <Input id="nome-subgrupo" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Aluguel" />
          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </div>
        <DialogFooter>
          <Button disabled={pending || !nome} onClick={submeter}>
            {subgrupo ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
