"use client";

import { useState, useTransition } from "react";
import { Paperclip } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AnexoPreviewDialog } from "@/features/lancamentos/anexo-preview-dialog";
import { obterUrlAnexo } from "@/lib/actions/lancamentos";

/** Botão "📎 nome-do-arquivo" — o bucket é privado, então o link só existe
 * depois de pedir uma URL assinada na hora do clique (obterUrlAnexo), em vez
 * de assinar todo mundo de antemão sem saber se alguém vai abrir. Clicar
 * carrega a visualização num modal (AnexoPreviewDialog) em vez de abrir/
 * baixar — imagem e PDF o navegador já sabe mostrar sozinho.
 *
 * `compact` troca o texto por só o ícone (com o nome em `title`/texto pra
 * leitor de tela) — usado na lista de lançamentos, onde não sobra espaço
 * pro nome do arquivo do lado do nome do lançamento. */
export function AnexoLink({
  anexoPath,
  nome,
  compact = false,
}: {
  anexoPath: string;
  nome: string | null;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function abrir() {
    startTransition(async () => {
      const result = await obterUrlAnexo(anexoPath);
      if (result.error || !result.url) {
        toast.error(result.error ?? "Não foi possível abrir o anexo.");
        return;
      }
      setUrl(result.url);
      setOpen(true);
    });
  }

  return (
    <>
      {compact ? (
        <Button type="button" variant="ghost" size="icon" onClick={abrir} disabled={pending} title={nome ?? "Anexo"}>
          <Paperclip className="size-4" />
          <span className="sr-only">{nome ?? "Anexo"}</span>
        </Button>
      ) : (
        <Button type="button" variant="ghost" size="sm" onClick={abrir} disabled={pending} className="max-w-full">
          <Paperclip className="size-4 shrink-0" />
          <span className="truncate">{nome ?? "Anexo"}</span>
        </Button>
      )}
      <AnexoPreviewDialog open={open} onOpenChange={setOpen} url={url} nome={nome} />
    </>
  );
}
