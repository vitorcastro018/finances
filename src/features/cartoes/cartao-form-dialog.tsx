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
import { criarCartao, editarCartao } from "@/lib/actions/cartoes";
import type { CartaoRow } from "@/lib/supabase/types";

type Props = { trigger: ReactNode; cartao?: CartaoRow };

export function CartaoFormDialog({ trigger, cartao }: Props) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(cartao?.nome ?? "");
  const [diaFechamento, setDiaFechamento] = useState(cartao ? String(cartao.dia_fechamento) : "1");
  const [diaVencimento, setDiaVencimento] = useState(cartao ? String(cartao.dia_vencimento) : "10");
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | undefined>();

  function submeter() {
    setErro(undefined);
    const input = { nome, dia_fechamento: diaFechamento, dia_vencimento: diaVencimento };
    startTransition(async () => {
      const result = cartao ? await editarCartao(cartao.id, input) : await criarCartao(input);
      if (result.error) {
        setErro(result.error);
        return;
      }
      toast.success(cartao ? "Cartão atualizado." : "Cartão criado.");
      setOpen(false);
      if (!cartao) setNome("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cartao ? "Editar cartão" : "Novo cartão"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome-cartao">Nome</Label>
            <Input id="nome-cartao" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Nubank" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="dia-fechamento">Dia de fechamento</Label>
              <Input
                id="dia-fechamento"
                type="number"
                min="1"
                max="31"
                value={diaFechamento}
                onChange={(e) => setDiaFechamento(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dia-vencimento-cartao">Dia de vencimento</Label>
              <Input
                id="dia-vencimento-cartao"
                type="number"
                min="1"
                max="31"
                value={diaVencimento}
                onChange={(e) => setDiaVencimento(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Compra depois do fechamento cai na fatura seguinte — o app calcula isso sozinho ao lançar.
          </p>

          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </div>
        <DialogFooter>
          <Button disabled={pending || !nome} onClick={submeter}>
            {cartao ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
