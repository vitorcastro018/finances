"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
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

/** Botão "+" ao lado do <select> de subcategoria nos formulários de
 * lançamento/conta fixa — mesma ideia do CategoriaQuickCreate, mas já
 * dentro de uma categoria escolhida: herda tipo e cor do pai, só pede o
 * nome. */
export function SubcategoriaQuickCreate({
  categoriaPai,
  onCreated,
}: {
  categoriaPai: CategoriaRow;
  onCreated: (categoria: CategoriaRow) => void;
}) {
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
      if (result.error || !result.categoria) {
        setErro(result.error ?? "Não foi possível criar a subcategoria.");
        return;
      }
      toast.success("Subcategoria criada.");
      onCreated(result.categoria);
      setOpen(false);
      setNome("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="icon" title="Nova subcategoria">
          <Plus className="size-4" />
          <span className="sr-only">Nova subcategoria</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova subcategoria em &quot;{categoriaPai.nome}&quot;</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="nome-subcategoria-rapida">Nome</Label>
          <Input
            id="nome-subcategoria-rapida"
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
