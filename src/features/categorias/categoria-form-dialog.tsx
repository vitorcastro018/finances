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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { criarCategoria, editarCategoria } from "@/lib/actions/categorias";
import type { CategoriaRow, TipoLancamento } from "@/lib/supabase/types";

export function CategoriaFormDialog({ trigger, categoria }: { trigger: ReactNode; categoria?: CategoriaRow }) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(categoria?.nome ?? "");
  const [tipo, setTipo] = useState<TipoLancamento>(categoria?.tipo ?? "saida");
  const [cor, setCor] = useState(categoria?.cor ?? "#64748b");
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | undefined>();

  function submeter() {
    setErro(undefined);
    startTransition(async () => {
      // categoria_pai_id nunca é editável aqui — reenviar o valor atual
      // evita que salvar o nome/cor de uma subcategoria a solte do pai.
      const result = categoria
        ? await editarCategoria(categoria.id, { nome, tipo, cor, categoria_pai_id: categoria.categoria_pai_id })
        : await criarCategoria({ nome, tipo, cor, categoria_pai_id: null });
      if (result.error) {
        setErro(result.error);
        return;
      }
      toast.success(categoria ? "Categoria atualizada." : "Categoria criada.");
      setOpen(false);
      if (!categoria) setNome("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {categoria ? (categoria.categoria_pai_id ? "Editar subcategoria" : "Editar categoria") : "Nova categoria"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome-categoria">Nome</Label>
            <Input
              id="nome-categoria"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Aluguel, Mercado, Salário"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoLancamento)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="saida">Saída</SelectItem>
                  <SelectItem value="entrada">Entrada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cor-categoria">Cor (gráfico)</Label>
              <Input id="cor-categoria" type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="h-9 p-1" />
            </div>
          </div>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </div>
        <DialogFooter>
          <Button disabled={pending || !nome} onClick={submeter}>
            {categoria ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
