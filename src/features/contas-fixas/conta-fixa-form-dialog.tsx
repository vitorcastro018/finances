"use client";

import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { criarContaFixa, editarContaFixa } from "@/lib/actions/contas-fixas";
import type { GrupoComSubgrupos } from "@/lib/data/categorias";
import type { ContaFixaRow } from "@/lib/supabase/types";

type Props = { grupos: GrupoComSubgrupos[]; trigger: ReactNode; contaFixa?: ContaFixaRow };

export function ContaFixaFormDialog({ grupos, trigger, contaFixa }: Props) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(contaFixa?.nome ?? "");
  const [subgrupoId, setSubgrupoId] = useState(contaFixa?.subgrupo_id ?? "");
  const [valor, setValor] = useState(contaFixa?.valor_previsto != null ? String(contaFixa.valor_previsto) : "");
  const [diaVencimento, setDiaVencimento] = useState(contaFixa ? String(contaFixa.dia_vencimento) : "5");
  const [ativa, setAtiva] = useState(contaFixa?.ativa ?? true);
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | undefined>();

  function submeter() {
    setErro(undefined);
    const input = { nome, subgrupo_id: subgrupoId, valor_previsto: valor, dia_vencimento: diaVencimento, ativa };
    startTransition(async () => {
      const result = contaFixa ? await editarContaFixa(contaFixa.id, input) : await criarContaFixa(input);
      if (result.error) {
        setErro(result.error);
        return;
      }
      toast.success(contaFixa ? "Conta fixa atualizada." : "Conta fixa criada.");
      setOpen(false);
      if (!contaFixa) {
        setNome("");
        setValor("");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{contaFixa ? "Editar conta fixa" : "Nova conta fixa"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome-conta-fixa">Nome</Label>
            <Input id="nome-conta-fixa" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Aluguel" />
          </div>

          <div className="space-y-2">
            <Label>Subgrupo</Label>
            <Select value={subgrupoId} onValueChange={setSubgrupoId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha" />
              </SelectTrigger>
              <SelectContent>
                {grupos.map((g) =>
                  g.subgrupos.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {g.nome} › {s.nome}
                    </SelectItem>
                  )),
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="valor-conta-fixa">Valor previsto</Label>
              <Input
                id="valor-conta-fixa"
                type="number"
                step="0.01"
                min="0"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="Vazio = variável"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dia-vencimento">Dia de vencimento</Label>
              <Input
                id="dia-vencimento"
                type="number"
                min="1"
                max="31"
                value={diaVencimento}
                onChange={(e) => setDiaVencimento(e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={ativa} onCheckedChange={(v) => setAtiva(v === true)} />
            Ativa (gera previstos todo mês)
          </label>

          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </div>
        <DialogFooter>
          <Button disabled={pending || !nome || !subgrupoId} onClick={submeter}>
            {contaFixa ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
