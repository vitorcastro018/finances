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
import type { CategoriaRow, TipoLancamento } from "@/lib/supabase/types";

/** Botão "+" ao lado do <select> de categoria nos formulários de lançamento
 * — cria a categoria sem sair do formulário atual. O tipo (entrada/saída)
 * vem do formulário que chamou, pra categoria nova já nascer compatível com
 * o que está sendo selecionado ali. */
export function CategoriaQuickCreate({
  tipo,
  onCreated,
}: {
  tipo: TipoLancamento;
  onCreated: (categoria: CategoriaRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | undefined>();

  function submeter() {
    setErro(undefined);
    startTransition(async () => {
      const result = await criarCategoria({ nome, tipo, cor: "#64748b" });
      if (result.error || !result.categoria) {
        setErro(result.error ?? "Não foi possível criar a categoria.");
        return;
      }
      toast.success("Categoria criada.");
      onCreated(result.categoria);
      setOpen(false);
      setNome("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="icon" title="Nova categoria">
          <Plus className="size-4" />
          <span className="sr-only">Nova categoria</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova categoria {tipo === "entrada" ? "de entrada" : "de saída"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="nome-categoria-rapida">Nome</Label>
          <Input
            id="nome-categoria-rapida"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Assinaturas"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Cor e ajustes finos ficam em /categorias — aqui é só o essencial pra continuar o lançamento.
          </p>
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
