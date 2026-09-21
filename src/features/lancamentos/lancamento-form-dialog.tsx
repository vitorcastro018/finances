"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { FileText, Paperclip } from "lucide-react";
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
import { calcularDataFatura } from "@/lib/cartoes";
import { formatDate } from "@/lib/format";
import { todayInAppTimezone } from "@/lib/timezone";
import type { CartaoRow, CategoriaRow, LancamentoRow, TipoLancamento } from "@/lib/supabase/types";

const SEM_CARTAO = "__nenhum__";

type Props = {
  categorias: CategoriaRow[];
  cartoes: CartaoRow[];
  /** Sem trigger, o diálogo só abre por controle externo (open/onOpenChange)
   * — caso da linha de /lancamentos, onde clicar em qualquer lugar da linha
   * abre a edição, sem precisar de um botão dedicado. */
  trigger?: ReactNode;
  /** Presente = editar; ausente = criar. */
  lancamento?: LancamentoRow;
  dataPrevistaPadrao?: string;
  /** Controle externo do aberto/fechado — quando ausente, o componente
   * controla seu próprio estado (caso dos botões "Novo lançamento"/
   * "Parcelado", que só abrem via `trigger`). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function LancamentoFormDialog({
  categorias,
  cartoes,
  trigger,
  lancamento,
  dataPrevistaPadrao,
  open: openControlado,
  onOpenChange: onOpenChangeControlado,
}: Props) {
  const [openInterno, setOpenInterno] = useState(false);
  const open = openControlado ?? openInterno;
  const setOpen = onOpenChangeControlado ?? setOpenInterno;
  const [nome, setNome] = useState(lancamento?.nome ?? "");
  const [tipo, setTipo] = useState<TipoLancamento>(lancamento?.tipo ?? "saida");
  const [categoriaId, setCategoriaId] = useState(lancamento?.categoria_id ?? "");
  const [valor, setValor] = useState(lancamento ? String(lancamento.valor_previsto) : "");
  const [cartaoId, setCartaoId] = useState(lancamento?.cartao_id ?? "");
  // Editando um lançamento de cartão, o campo de data reoferece a data da
  // COMPRA (data_compra), não o vencimento já calculado (data_prevista) —
  // senão cada edição sem mexer na data empurraria o vencimento de novo.
  const [data, setData] = useState(
    (lancamento?.cartao_id ? lancamento.data_compra : lancamento?.data_prevista) ??
      dataPrevistaPadrao ??
      todayInAppTimezone(),
  );
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
  // O cartão já escolhido continua na lista mesmo se foi desativado depois
  // (senão o <select> "perderia" o valor atual ao editar).
  const cartoesDisponiveis = cartoes.filter((c) => c.ativo || c.id === cartaoId);
  const cartaoSelecionado = cartoes.find((c) => c.id === cartaoId);
  // Preview de "em qual fatura isso cai" — mesma conta que a action faz no
  // servidor (calcularDataFatura), só que aqui é pra mostrar na hora, antes
  // de salvar.
  const dataFaturaPreview =
    cartaoSelecionado && data
      ? calcularDataFatura(data, cartaoSelecionado.dia_fechamento, cartaoSelecionado.dia_vencimento)
      : null;
  // Prévia local (não sobe nada, só mostra) do arquivo escolhido, quando é
  // imagem — dá pra ver que a foto certa foi selecionada antes de salvar.
  // Derivado com useMemo (não useState): criar a blob: URL não é um efeito
  // colateral que precise de setState, só uma conta a partir do arquivo
  // atual — só a limpeza (revogar a URL) precisa de useEffect de verdade.
  const previewUrl = useMemo(() => {
    if (!arquivo || !arquivo.type.startsWith("image/")) return null;
    return URL.createObjectURL(arquivo);
  }, [arquivo]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);
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
      cartao_id: cartaoId,
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
        setCartaoId("");
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
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
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
              <Label htmlFor="data">{cartaoId ? "Data da compra" : "Vencimento"}</Label>
              <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metodo">Método (opcional)</Label>
              <Input id="metodo" value={metodo ?? ""} onChange={(e) => setMetodo(e.target.value)} placeholder="Pix, cartão…" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cartão de crédito (opcional)</Label>
            <Select
              value={cartaoId || SEM_CARTAO}
              onValueChange={(value) => setCartaoId(value === SEM_CARTAO ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_CARTAO}>Nenhum</SelectItem>
                {cartoesDisponiveis.map((cartao) => (
                  <SelectItem key={cartao.id} value={cartao.id}>
                    {cartao.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {dataFaturaPreview && (
              <p className="text-xs text-muted-foreground">Cai na fatura que vence em {formatDate(dataFaturaPreview)}.</p>
            )}
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
              <div className="flex items-center gap-3 rounded-md border p-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Paperclip className="size-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <AnexoLink anexoPath={anexoAtual.path} nome={anexoAtual.nome} />
                  <p className="text-xs text-muted-foreground">Clique pra visualizar</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setRemoverAnexoExistente(true)}>
                  Remover
                </Button>
              </div>
            ) : (
              <label
                htmlFor="anexo"
                className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed p-4 text-center transition-colors hover:bg-accent/40"
              >
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- prévia local (blob: da própria seleção), não faz sentido passar pelo otimizador de imagem.
                  <img src={previewUrl} alt="" className="max-h-24 rounded-md object-contain" />
                ) : arquivo ? (
                  <>
                    <FileText className="size-6 text-muted-foreground" />
                    <span className="max-w-full truncate text-sm">{arquivo.name}</span>
                  </>
                ) : (
                  <>
                    <Paperclip className="size-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Clique pra escolher uma foto ou PDF</span>
                  </>
                )}
                <input id="anexo" type="file" accept={ANEXO_ACCEPT} onChange={escolherArquivo} className="sr-only" />
              </label>
            )}
            {arquivo && previewUrl && <p className="truncate text-xs text-muted-foreground">{arquivo.name}</p>}
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
