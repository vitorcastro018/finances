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
import { criarParcelamento } from "@/lib/actions/lancamentos";
import { ordenarCategoriasParaSelect } from "@/lib/categorias";
import { formatCurrency } from "@/lib/format";
import { calcularParcelas } from "@/lib/parcelamento";
import { todayInAppTimezone } from "@/lib/timezone";
import type { CategoriaRow, TipoLancamento } from "@/lib/supabase/types";

export function ParcelamentoFormDialog({ categorias, trigger }: { categorias: CategoriaRow[]; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoLancamento>("saida");
  const [categoriaId, setCategoriaId] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [parcelas, setParcelas] = useState("6");
  const [jurosMensal, setJurosMensal] = useState("");
  const [dataPrimeira, setDataPrimeira] = useState(todayInAppTimezone());
  const [metodo, setMetodo] = useState("");
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | undefined>();
  // Cópia local: permite adicionar a categoria criada na hora, sem esperar a
  // página recarregar pra ela aparecer no <select>.
  const [listaCategorias, setListaCategorias] = useState(categorias);

  const categoriasDoTipo = useMemo(() => listaCategorias.filter((c) => c.tipo === tipo), [listaCategorias, tipo]);

  const preview = useMemo(() => {
    const total = Number(valorTotal);
    const n = Number(parcelas);
    if (!total || !n || n < 1) return null;
    const valores = calcularParcelas({ valorTotal: total, parcelas: n, jurosMensal: Number(jurosMensal || 0) });
    return { valorParcela: valores[0], somaTotal: valores.reduce((soma, v) => soma + v, 0) };
  }, [valorTotal, parcelas, jurosMensal]);

  function submeter() {
    setErro(undefined);
    startTransition(async () => {
      const result = await criarParcelamento({
        nome,
        tipo,
        categoria_id: categoriaId,
        valor_total: valorTotal,
        parcelas,
        juros_mensal: jurosMensal || "0",
        data_primeira_parcela: dataPrimeira,
        metodo,
      });
      if (result.error) {
        setErro(result.error);
        return;
      }
      toast.success(`Parcelamento criado: ${parcelas}x.`);
      setOpen(false);
      setNome("");
      setValorTotal("");
      setJurosMensal("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova compra parcelada</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome-parcelamento">Nome</Label>
            <Input id="nome-parcelamento" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: TV" />
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
              <Label>Categoria</Label>
              <div className="flex gap-2">
                <Select value={categoriaId} onValueChange={setCategoriaId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Escolha" />
                  </SelectTrigger>
                  <SelectContent>
                    {ordenarCategoriasParaSelect(categoriasDoTipo).map((opcao) => (
                      <SelectItem key={opcao.id} value={opcao.id}>
                        {opcao.label}
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
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="valor-total">Valor total</Label>
              <Input
                id="valor-total"
                type="number"
                step="0.01"
                min="0"
                value={valorTotal}
                onChange={(e) => setValorTotal(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parcelas">Parcelas</Label>
              <Input
                id="parcelas"
                type="number"
                min="2"
                max="60"
                value={parcelas}
                onChange={(e) => setParcelas(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="juros">Juros a.m. (%)</Label>
              <Input
                id="juros"
                type="number"
                step="0.01"
                min="0"
                value={jurosMensal}
                onChange={(e) => setJurosMensal(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="data-primeira">1ª parcela</Label>
              <Input
                id="data-primeira"
                type="date"
                value={dataPrimeira}
                onChange={(e) => setDataPrimeira(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metodo-parcelamento">Método (opcional)</Label>
              <Input
                id="metodo-parcelamento"
                value={metodo}
                onChange={(e) => setMetodo(e.target.value)}
                placeholder="Cartão Nubank…"
              />
            </div>
          </div>

          {preview && (
            <p className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
              {parcelas}x de {formatCurrency(preview.valorParcela)}
              {Number(jurosMensal) > 0 && <> · total com juros: {formatCurrency(preview.somaTotal)}</>}
            </p>
          )}

          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </div>
        <DialogFooter>
          <Button disabled={pending || !nome || !categoriaId || !valorTotal} onClick={submeter}>
            Criar parcelamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
