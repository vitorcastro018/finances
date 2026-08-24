"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
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
import { criarLancamento, editarLancamento } from "@/lib/actions/lancamentos";
import { todayInAppTimezone } from "@/lib/timezone";
import type { GrupoComSubgrupos } from "@/lib/data/categorias";
import type { LancamentoRow, TipoLancamento } from "@/lib/supabase/types";

type Props = {
  grupos: GrupoComSubgrupos[];
  trigger: ReactNode;
  /** Presente = editar; ausente = criar (usado tanto pelo CRUD de /lancamentos
   * quanto pelo botão "adicionar conta avulsa deste mês" em /contas). */
  lancamento?: LancamentoRow;
  dataPrevistaPadrao?: string;
};

export function LancamentoFormDialog({ grupos, trigger, lancamento, dataPrevistaPadrao }: Props) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(lancamento?.nome ?? "");
  const [tipo, setTipo] = useState<TipoLancamento>(lancamento?.tipo ?? "saida");
  const [grupoId, setGrupoId] = useState(lancamento?.grupo_id ?? "");
  const [subgrupoId, setSubgrupoId] = useState(lancamento?.subgrupo_id ?? "");
  const [valor, setValor] = useState(lancamento ? String(lancamento.valor_previsto) : "");
  const [data, setData] = useState(lancamento?.data_prevista ?? dataPrevistaPadrao ?? todayInAppTimezone());
  const [metodo, setMetodo] = useState(lancamento?.metodo ?? "");
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | undefined>();

  const gruposDoTipo = useMemo(() => grupos.filter((g) => g.tipo === tipo), [grupos, tipo]);
  const subgrupoOptions = gruposDoTipo.find((g) => g.id === grupoId)?.subgrupos ?? [];

  function submeter() {
    setErro(undefined);
    const input = {
      nome,
      tipo,
      grupo_id: grupoId,
      subgrupo_id: subgrupoId,
      valor_previsto: valor,
      data_prevista: data,
      metodo,
    };
    startTransition(async () => {
      const result = lancamento
        ? await editarLancamento(lancamento.id, input)
        : await criarLancamento(input);
      if (result.error) {
        setErro(result.error);
        return;
      }
      toast.success(lancamento ? "Lançamento atualizado." : "Lançamento criado.");
      setOpen(false);
      if (!lancamento) {
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
          <DialogTitle>{lancamento ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Viagem, manutenção do carro" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={tipo}
                onValueChange={(value) => {
                  setTipo(value as TipoLancamento);
                  setGrupoId("");
                  setSubgrupoId("");
                }}
              >
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
              <Label htmlFor="valor">Valor previsto</Label>
              <Input id="valor" type="number" step="0.01" min="0" value={valor} onChange={(e) => setValor(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Grupo</Label>
              <Select value={grupoId} onValueChange={(value) => { setGrupoId(value); setSubgrupoId(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha" />
                </SelectTrigger>
                <SelectContent>
                  {gruposDoTipo.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subgrupo</Label>
              <Select value={subgrupoId} onValueChange={setSubgrupoId} disabled={!grupoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {subgrupoOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="data">Vencimento</Label>
              <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metodo">Método (opcional)</Label>
              <Input id="metodo" value={metodo ?? ""} onChange={(e) => setMetodo(e.target.value)} placeholder="Pix, cartão…" />
            </div>
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </div>
        <DialogFooter>
          <Button disabled={pending || !nome || !grupoId} onClick={submeter}>
            {lancamento ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
