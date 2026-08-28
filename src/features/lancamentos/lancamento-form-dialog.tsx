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
import { CategoriaQuickCreate } from "@/features/categorias/categoria-quick-create";
import { criarLancamento, editarLancamento } from "@/lib/actions/lancamentos";
import { todayInAppTimezone } from "@/lib/timezone";
import type { CategoriaRow, LancamentoRow, TipoLancamento } from "@/lib/supabase/types";

type Props = {
  categorias: CategoriaRow[];
  trigger: ReactNode;
  /** Presente = editar; ausente = criar (usado tanto pelo CRUD de /lancamentos
   * quanto pelo botão "adicionar conta avulsa deste mês" em /contas). */
  lancamento?: LancamentoRow;
  dataPrevistaPadrao?: string;
};

export function LancamentoFormDialog({ categorias, trigger, lancamento, dataPrevistaPadrao }: Props) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(lancamento?.nome ?? "");
  const [tipo, setTipo] = useState<TipoLancamento>(lancamento?.tipo ?? "saida");
  const [categoriaId, setCategoriaId] = useState(lancamento?.categoria_id ?? "");
  const [valor, setValor] = useState(lancamento ? String(lancamento.valor_previsto) : "");
  const [data, setData] = useState(lancamento?.data_prevista ?? dataPrevistaPadrao ?? todayInAppTimezone());
  const [metodo, setMetodo] = useState(lancamento?.metodo ?? "");
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | undefined>();
  // Cópia local: permite adicionar a categoria criada na hora, sem esperar a
  // página recarregar pra ela aparecer no <select>.
  const [listaCategorias, setListaCategorias] = useState(categorias);

  const categoriasDoTipo = useMemo(() => listaCategorias.filter((c) => c.tipo === tipo), [listaCategorias, tipo]);

  function submeter() {
    setErro(undefined);
    const input = {
      nome,
      tipo,
      categoria_id: categoriaId,
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
                  setCategoriaId("");
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

          <div className="space-y-2">
            <Label>Categoria</Label>
            <div className="flex gap-2">
              <Select value={categoriaId} onValueChange={setCategoriaId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Escolha" />
                </SelectTrigger>
                <SelectContent>
                  {categoriasDoTipo.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <CategoriaQuickCreate
                tipo={tipo}
                onCreated={(nova) => {
                  setListaCategorias((prev) => [...prev, nova].sort((a, b) => a.nome.localeCompare(b.nome)));
                  setCategoriaId(nova.id);
                }}
              />
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
          <Button disabled={pending || !nome || !categoriaId} onClick={submeter}>
            {lancamento ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
