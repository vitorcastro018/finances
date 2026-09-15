/** Nome do bucket privado no Supabase Storage — ver
 * supabase/migrations/08_anexos.sql (RLS por dono, sem acesso público). */
export const BUCKET_ANEXOS = "anexos";

export const ANEXO_TAMANHO_MAXIMO = 8 * 1024 * 1024; // 8 MB — dá pra foto de celular sem exagero.

const ANEXO_TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/** Passado pro `accept` do <input type="file">. */
export const ANEXO_ACCEPT = ANEXO_TIPOS_ACEITOS.join(",");

/** Mesma checagem client e server-side — cliente pra feedback na hora, server
 * porque o cliente nunca é confiável sozinho. */
export function validarAnexo(arquivo: File): string | undefined {
  if (arquivo.size > ANEXO_TAMANHO_MAXIMO) return "Anexo muito grande — máximo 8 MB.";
  if (!ANEXO_TIPOS_ACEITOS.includes(arquivo.type)) {
    return "Formato não aceito — envie uma foto (JPG/PNG/WEBP) ou PDF.";
  }
  return undefined;
}

function extensaoDoArquivo(nomeOriginal: string): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(nomeOriginal);
  return match ? match[1].toLowerCase() : "bin";
}

/** Organizado por dono e pela competência do lançamento (ano/mês da
 * data_prevista, não da data do upload) — achar o comprovante de março é
 * abrir a pasta de março, esteja o lançamento pago hoje ou não. */
export function caminhoAnexo(userId: string, lancamentoId: string, dataPrevista: string, nomeOriginal: string): string {
  const [ano, mes] = dataPrevista.split("-");
  return `${userId}/${ano}/${mes}/${lancamentoId}.${extensaoDoArquivo(nomeOriginal)}`;
}
