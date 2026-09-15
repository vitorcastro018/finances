"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
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
import { CategoriaSubcategoriaSelect } from "@/features/categorias/categoria-subcategoria-select";
import { AnexoLink } from "@/features/lancamentos/anexo-link";
import { criarLancamento, editarLancamento, enviarAnexoLancamento, removerAnexoLancamento } from "@/lib/actions/lancamentos";
import { ANEXO_ACCEPT, validarAnexo } from "@/lib/anexos";
import { todayInAppTimezone } from "@/lib/timezone";
import type { CategoriaRow, LancamentoRow, TipoLancamento } from "@/lib/supabase/types";

type Props = {
  categorias: CategoriaRow[];
  trigger: ReactNode;
  /** Presente = editar; ausente = criar. */
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
  // Só existe na criação — editar não toca em pago/valor_pago/data_pagamento
  // (isso é papel do "Marcar como pago" da lista, que sabe o valor real).
  const [pago, setPago] = useState(false);
  // Comprovante: arquivo novo escolhido (anexar pela primeira vez ou trocar
  // um já existente) e o pedido de remover o que já está anexado — os dois
  // só se efetivam de verdade no submit, junto com o resto do formulário.
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [removerAnexoExistente, setRemoverAnexoExistente] = useState(false);
  const [erroArquivo, setErroArquivo] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | undefined>();
  // Cópia local: permite adicionar a categoria criada na hora, sem esperar a
  // página recarregar pra ela aparecer no <select>.
  const [listaCategorias, setListaCategorias] = useState(categorias);

  const categoriasDoTipo = useMemo(() => listaCategorias.filter((c) => c.tipo === tipo), [listaCategorias, tipo]);
  // Só mostra o anexo já salvo enquanto ninguém pediu pra remover — depois
  // disso vira "sem anexo" na tela, mesmo antes de salvar.
  const anexoAtual =
    lancamento?.anexo_path && !removerAnexoExistente
      ? { path: lancamento.anexo_path, nome: lancamento.anexo_nome }
      : null;

  function escolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const escolhido = e.target.files?.[0] ?? null;
    if (!escolhido) {
      setArquivo(null);
      setErroArquivo(undefined);
      return;
    }
    const erroValidacao = validarAnexo(escolhido);
    if (erroValidacao) {
      setErroArquivo(erroValidacao);
      setArquivo(null);
      e.target.value = "";
      return;
    }
    setErroArquivo(undefined);
    setArquivo(escolhido);
  }

  function submeter() {
    setErro(undefined);
    const input = {
      nome,
      tipo,
      categoria_id: categoriaId,
      valor_previsto: valor,
      data_prevista: data,
      metodo,
      ...(!lancamento && { pago }),
    };
    startTransition(async () => {
      const result = lancamento
        ? await editarLancamento(lancamento.id, input)
        : await criarLancamento(input, arquivo ?? undefined);
      if (result.error) {
        setErro(result.error);
        return;
      }

      // Na edição o anexo é tratado à parte de editarLancamento — arquivo
      // novo (anexar ou trocar) tem prioridade sobre um pedido de remover.
      if (lancamento) {
        if (arquivo) {
          const resultAnexo = await enviarAnexoLancamento(lancamento.id, arquivo);
          if (resultAnexo.error) {
            setErro(resultAnexo.error);
            return;
          }
        } else if (removerAnexoExistente) {
          const resultRemover = await removerAnexoLancamento(lancamento.id);
          if (resultRemover.error) {
            setErro(resultRemover.error);
            return;
          }
        }
      }

      toast.success(lancamento ? "Lançamento atualizado." : "Lançamento criado.");
      setOpen(false);
      setArquivo(null);
      setRemoverAnexoExistente(false);
      if (!lancamento) {
        setNome("");
        setValor("");
        setPago(false);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(novoAberto) => {
        setOpen(novoAberto);
        // Reabrir sempre parte de "nenhuma mudança de anexo pendente" — sem
        // isso, cancelar depois de clicar em "Remover" deixava a tela
        // mostrando "sem anexo" da próxima vez, mesmo sem ter salvo nada.
        if (novoAberto) {
          setArquivo(null);
          setRemoverAnexoExistente(false);
          setErroArquivo(undefined);
        }
      }}
    >
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

          <CategoriaSubcategoriaSelect
            categorias={categoriasDoTipo}
            value={categoriaId}
            onChange={setCategoriaId}
            tipo={tipo}
            onCategoriaCriada={(nova) => {
              setListaCategorias((prev) => [...prev, nova].sort((a, b) => a.nome.localeCompare(b.nome)));
              setCategoriaId(nova.id);
            }}
          />

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

          {!lancamento && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={pago} onCheckedChange={(v) => setPago(v === true)} />
              {tipo === "entrada" ? "Já recebi" : "Já paguei"}
            </label>
          )}

          <div className="space-y-2">
            <Label htmlFor="anexo">Comprovante (opcional)</Label>
            {anexoAtual ? (
              <div className="flex items-center justify-between gap-2 rounded-md border pr-1">
                <AnexoLink anexoPath={anexoAtual.path} nome={anexoAtual.nome} />
                <Button type="button" variant="ghost" size="sm" onClick={() => setRemoverAnexoExistente(true)}>
                  Remover
                </Button>
              </div>
            ) : (
              <Input id="anexo" type="file" accept={ANEXO_ACCEPT} onChange={escolherArquivo} />
            )}
            {arquivo && <p className="text-xs text-muted-foreground">Novo arquivo: {arquivo.name}</p>}
            {erroArquivo && <p className="text-sm text-destructive">{erroArquivo}</p>}
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
