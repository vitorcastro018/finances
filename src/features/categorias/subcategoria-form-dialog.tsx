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
import { criarCategoria } from "@/lib/actions/categorias";
import type { CategoriaRow } from "@/lib/supabase/types";

/** Cria uma subcategoria dentro de uma categoria de topo — herda tipo e cor
 * do pai (não editáveis aqui, só o nome), pra manter a hierarquia sempre
 * consistente. Só cria; editar reaproveita o CategoriaFormDialog normal. */
export function SubcategoriaFormDialog({ categoriaPai, trigger }: { categoriaPai: CategoriaRow; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | undefined>();

  function submeter() {
    setErro(undefined);
    startTransition(async () => {
      const result = await criarCategoria({
        nome,
        tipo: categoriaPai.tipo,
        cor: categoriaPai.cor,
        categoria_pai_id: categoriaPai.id,
      });
      if (result.error) {
        setErro(result.error);
        return;
      }
      toast.success("Subcategoria criada.");
      setOpen(false);
      setNome("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova subcategoria em &quot;{categoriaPai.nome}&quot;</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="nome-subcategoria">Nome</Label>
          <Input
            id="nome-subcategoria"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Mercado"
            autoFocus
          />
          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </div>
        <DialogFooter>
          <Button disabled={pending || !nome} onClick={submeter}>
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
