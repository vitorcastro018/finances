"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { BUCKET_ANEXOS, caminhoAnexo, validarAnexo } from "@/lib/anexos";
import { calcularParcelas } from "@/lib/parcelamento";
import { createClient } from "@/lib/supabase/server";
import { addMonthsToDate } from "@/lib/timezone";
import {
  lancamentoSchema,
  marcarPagoSchema,
  parcelamentoSchema,
  type LancamentoInput,
  type MarcarPagoInput,
  type ParcelamentoInput,
} from "@/lib/validation/lancamentos";
import type { ActionResult } from "@/lib/actions/categorias";
import type { Database } from "@/lib/supabase/types";

function revalidarTelas() {
  revalidatePath("/");
  revalidatePath("/lancamentos");
}

/** Usado tanto por "adicionar conta avulsa deste mês" quanto pelo CRUD de /lancamentos.
 * Marcado como já pago na criação (checkbox do formulário) usa o próprio
 * valor/data previstos como valor/data reais — pra ajustar pra um valor
 * diferente depois, é só usar "Marcar como pago" na lista mesmo.
 *
 * `arquivo` (opcional) é o comprovante escolhido no formulário — sobe pro
 * Storage antes de inserir a linha, com o mesmo id que a linha vai ter (por
 * isso o id é gerado aqui, não deixado pro `default gen_random_uuid()` do
 * banco), pra já nascer com o anexo ligado em vez de precisar de um segundo
 * update depois. */
export async function criarLancamento(input: LancamentoInput, arquivo?: File): Promise<ActionResult> {
  const parsed = lancamentoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { pago, ...resto } = parsed.data;
  const supabase = await createClient();
  const linha: Database["public"]["Tables"]["lancamentos"]["Insert"] = {
    ...resto,
    pago,
    valor_pago: pago ? resto.valor_previsto : null,
    data_pagamento: pago ? resto.data_prevista : null,
  };

  if (arquivo && arquivo.size > 0) {
    const erroAnexo = validarAnexo(arquivo);
    if (erroAnexo) return { error: erroAnexo };

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Sessão expirada — recarregue a página e tente de novo." };

    const id = randomUUID();
    const caminho = caminhoAnexo(auth.user.id, id, resto.data_prevista, arquivo.name);
    const { error: erroUpload } = await supabase.storage
      .from(BUCKET_ANEXOS)
      .upload(caminho, arquivo, { contentType: arquivo.type || undefined });
    if (erroUpload) return { error: `Não foi possível enviar o anexo: ${erroUpload.message}` };

    linha.id = id;
    linha.anexo_path = caminho;
    linha.anexo_nome = arquivo.name;
  }

  const { error } = await supabase.from("lancamentos").insert(linha);
  if (error) return { error: error.message };

  revalidarTelas();
  return {};
}

export async function editarLancamento(id: string, input: LancamentoInput): Promise<ActionResult> {
  const parsed = lancamentoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  // pago/valor_pago/data_pagamento ficam de fora da edição — quem cuida
  // disso é o "Marcar como pago"/"Desmarcar" da lista, que sabe o valor e
  // a data reais; editar não deve pisar num pagamento já registrado.
  const { nome, tipo, categoria_id, valor_previsto, data_prevista, metodo } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("lancamentos")
    .update({ nome, tipo, categoria_id, valor_previsto, data_prevista, metodo })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidarTelas();
  return {};
}

export async function apagarLancamento(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("lancamentos").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidarTelas();
  return {};
}

/** Compra parcelada (ex.: TV em 6x): calcula o valor de cada parcela
 * (`calcularParcelas`) e insere todos os lançamentos de uma vez, ligados
 * pelo mesmo `parcelamento_id`. */
export async function criarParcelamento(input: ParcelamentoInput): Promise<ActionResult> {
  const parsed = parcelamentoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { nome, tipo, categoria_id, valor_total, parcelas, juros_mensal, data_primeira_parcela, metodo } =
    parsed.data;
  const valores = calcularParcelas({ valorTotal: valor_total, parcelas, jurosMensal: juros_mensal });
  const parcelamentoId = randomUUID();

  const linhas = valores.map((valor, index) => ({
    nome: `${nome} (${index + 1}/${parcelas})`,
    tipo,
    categoria_id,
    valor_previsto: valor,
    data_prevista: addMonthsToDate(data_primeira_parcela, index),
    metodo,
    parcelamento_id: parcelamentoId,
    parcela_numero: index + 1,
    parcela_total: parcelas,
  }));

  const supabase = await createClient();
  const { error } = await supabase.from("lancamentos").insert(linhas);
  if (error) return { error: error.message };

  revalidarTelas();
  return {};
}

/** Valor real pago pode diferir do previsto — os dois ficam gravados. */
export async function marcarComoPago(input: MarcarPagoInput): Promise<ActionResult> {
  const parsed = marcarPagoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("lancamentos")
    .update({
      pago: true,
      valor_pago: parsed.data.valor_pago,
      data_pagamento: parsed.data.data_pagamento,
    })
    .eq("id", parsed.data.id);
  if (error) return { error: error.message };

  revalidarTelas();
  return {};
}

/** Desmarcar precisa funcionar de volta — às vezes se marca errado. */
export async function desmarcarComoPago(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("lancamentos")
    .update({ pago: false, valor_pago: null, data_pagamento: null })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidarTelas();
  return {};
}

/** Anexa (ou troca) o comprovante de um lançamento já existente — usado no
 * dialog de editar, separado de `editarLancamento` pra não misturar upload
 * de arquivo com os campos de texto do formulário. */
export async function enviarAnexoLancamento(id: string, arquivo: File): Promise<ActionResult> {
  const erroAnexo = validarAnexo(arquivo);
  if (erroAnexo) return { error: erroAnexo };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Sessão expirada — recarregue a página e tente de novo." };

  const { data: lancamento, error: erroBusca } = await supabase
    .from("lancamentos")
    .select("data_prevista, anexo_path")
    .eq("id", id)
    .single();
  if (erroBusca || !lancamento) return { error: "Lançamento não encontrado." };

  const caminho = caminhoAnexo(auth.user.id, id, lancamento.data_prevista, arquivo.name);
  const { error: erroUpload } = await supabase.storage
    .from(BUCKET_ANEXOS)
    .upload(caminho, arquivo, { upsert: true, contentType: arquivo.type || undefined });
  if (erroUpload) return { error: `Não foi possível enviar o anexo: ${erroUpload.message}` };

  // Trocou de extensão (era .jpg, virou .pdf) — o caminho muda, então o
  // antigo fica órfão no bucket. Cada lançamento tem no máximo um anexo, não
  // vale controlar histórico à parte — só limpa o que sobrou pra trás.
  if (lancamento.anexo_path && lancamento.anexo_path !== caminho) {
    await supabase.storage.from(BUCKET_ANEXOS).remove([lancamento.anexo_path]);
  }

  const { error } = await supabase
    .from("lancamentos")
    .update({ anexo_path: caminho, anexo_nome: arquivo.name })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidarTelas();
  return {};
}

/** Remove o anexo (arquivo do Storage + referência na linha), sem apagar o
 * lançamento — anexei o comprovante errado, ou não quero mais guardar. */
export async function removerAnexoLancamento(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: lancamento, error: erroBusca } = await supabase
    .from("lancamentos")
    .select("anexo_path")
    .eq("id", id)
    .single();
  if (erroBusca || !lancamento) return { error: "Lançamento não encontrado." };

  if (lancamento.anexo_path) {
    await supabase.storage.from(BUCKET_ANEXOS).remove([lancamento.anexo_path]);
  }

  const { error } = await supabase
    .from("lancamentos")
    .update({ anexo_path: null, anexo_nome: null })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidarTelas();
  return {};
}

/** Link assinado pra abrir/baixar o anexo — o bucket é privado, então não dá
 * pra linkar a URL direto. Gerado na hora, só quando alguém clica em vez de
 * assinar tudo de antemão; o RLS de storage.objects (08_anexos.sql) já
 * garante que só o dono do lançamento consegue assinar o caminho dele. */
export async function obterUrlAnexo(path: string): Promise<ActionResult & { url?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(BUCKET_ANEXOS).createSignedUrl(path, 60 * 5);
  if (error || !data) return { error: error?.message ?? "Não foi possível abrir o anexo." };
  return { url: data.signedUrl };
}
