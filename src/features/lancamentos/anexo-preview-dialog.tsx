"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type TipoPreview = "imagem" | "pdf" | "outro";

function tipoPreviewDoNome(nome: string | null): TipoPreview {
  const ext = nome?.split(".").pop()?.toLowerCase();
  if (ext && ["jpg", "jpeg", "png", "webp"].includes(ext)) return "imagem";
  if (ext === "pdf") return "pdf";
  return "outro";
}

/** Mostra o anexo direto no modal — imagem e PDF o navegador já sabe
 * renderizar sozinho, então não tem por que forçar download só pra olhar o
 * comprovante. "outro" é só rede de segurança: o formulário só aceita
 * imagem/PDF pra começo de conversa. */
export function AnexoPreviewDialog({
  open,
  onOpenChange,
  url,
  nome,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string | null;
  nome: string | null;
}) {
  const tipo = tipoPreviewDoNome(nome);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{nome ?? "Anexo"}</DialogTitle>
        </DialogHeader>
        {url && tipo === "imagem" && (
          // eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária do Storage, não faz sentido passar pelo otimizador de imagem.
          <img src={url} alt={nome ?? "Anexo"} className="max-h-[70vh] w-full rounded-md object-contain" />
        )}
        {url && tipo === "pdf" && (
          <iframe src={url} title={nome ?? "Anexo"} className="h-[70vh] w-full rounded-md border" />
        )}
        {url && tipo === "outro" && (
          <p className="text-sm text-muted-foreground">
            Esse tipo de arquivo não tem visualização —{" "}
            <a href={url} target="_blank" rel="noopener noreferrer" className="underline">
              baixe pra abrir
            </a>
            .
          </p>
        )}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Abrir em outra aba / baixar
          </a>
        )}
      </DialogContent>
    </Dialog>
  );
}
