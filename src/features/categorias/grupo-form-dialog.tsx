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
import { criarGrupo, editarGrupo } from "@/lib/actions/categorias";
import type { GrupoRow, TipoLancamento } from "@/lib/supabase/types";

export function GrupoFormDialog({ trigger, grupo }: { trigger: ReactNode; grupo?: GrupoRow }) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(grupo?.nome ?? "");
  const [tipo, setTipo] = useState<TipoLancamento>(grupo?.tipo ?? "saida");
  const [cor, setCor] = useState(grupo?.cor ?? "#64748b");
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | undefined>();

  function submeter() {
    setErro(undefined);
    startTransition(async () => {
      const result = grupo
        ? await editarGrupo(grupo.id, { nome, tipo, cor })
        : await criarGrupo({ nome, tipo, cor });
      if (result.error) {
        setErro(result.error);
        return;
      }
      toast.success(grupo ? "Grupo atualizado." : "Grupo criado.");
      setOpen(false);
      if (!grupo) setNome("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{grupo ? "Editar grupo" : "Novo grupo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome-grupo">Nome</Label>
            <Input id="nome-grupo" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Despesas Fixas" />
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
              <Label htmlFor="cor-grupo">Cor (gráfico)</Label>
              <Input id="cor-grupo" type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="h-9 p-1" />
            </div>
          </div>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </div>
        <DialogFooter>
          <Button disabled={pending || !nome} onClick={submeter}>
            {grupo ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
