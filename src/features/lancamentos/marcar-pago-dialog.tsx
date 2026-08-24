"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { marcarComoPago, desmarcarComoPago } from "@/lib/actions/lancamentos";
import { formatCurrency } from "@/lib/format";
import { todayInAppTimezone } from "@/lib/timezone";

type ContaPagavel = {
  id: string;
  nome: string;
  valor_previsto: number;
  pago: boolean;
};

export function MarcarPagoDialog({ conta }: { conta: ContaPagavel }) {
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState(String(conta.valor_previsto));
  const [data, setData] = useState(todayInAppTimezone());
  const [pending, startTransition] = useTransition();

  if (conta.pago) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await desmarcarComoPago(conta.id);
            if (result.error) toast.error(result.error);
            else toast.success("Marcação de pago desfeita.");
          })
        }
      >
        Desmarcar
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Marcar como pago</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar &quot;{conta.nome}&quot; como pago</DialogTitle>
          <DialogDescription>
            Previsto: {formatCurrency(conta.valor_previsto)}. O valor real pode ser diferente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="valor_pago">Valor pago</Label>
            <Input
              id="valor_pago"
              type="number"
              step="0.01"
              min="0"
              value={valor}
              onChange={(event) => setValor(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="data_pagamento">Data do pagamento</Label>
            <Input
              id="data_pagamento"
              type="date"
              value={data}
              onChange={(event) => setData(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await marcarComoPago({
                  id: conta.id,
                  valor_pago: Number(valor),
                  data_pagamento: data,
                });
                if (result.error) toast.error(result.error);
                else {
                  toast.success("Marcado como pago.");
                  setOpen(false);
                }
              })
            }
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
