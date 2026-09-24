"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { BUCKET_ANEXOS, caminhoAnexo, validarAnexo } from "@/lib/anexos";
import { calcularDataFatura } from "@/lib/cartoes";
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

/** Quando o lançamento tem cartão, o valor digitado no campo de data é a
 * DATA DA COMPRA, não o vencimento — aqui resolve pra data de vencimento
 * real (a fatura em que a compra cai), buscando o fechamento/vencimento do
 * cartão e aplicando `calcularDataFatura` (lib/cartoes.ts). Sem cartão, a
 * data digitada já é o vencimento — nada a resolver. */
async function resolverDataFatura(
  supabase: Awaited<ReturnType<typeof createClient>>,
  cartaoId: string,
  dataCompra: string,
): Promise<{ data?: string; error?: string }> {
  const { data: cartao, error } = await supabase
    .from("cartoes")
    .select("dia_fechamento, dia_vencimento")
    .eq("id", cartaoId)
    .single();
  if (error) return { error: error.message };
  if (!cartao) return { error: "Cartão não encontrado." };
  return { data: calcularDataFatura(dataCompra, cartao.dia_fechamento, cartao.dia_vencimento) };
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

  const { pago, cartao_id, ...resto } = parsed.data;
  const supabase = await createClient();

  let dataPrevista = resto.data_prevista;
  let dataCompra: string | null = null;
  if (cartao_id) {
    const resolvido = await resolverDataFatura(supabase, cartao_id, resto.data_prevista);
    if (resolvido.error) return { error: resolvido.error };
    dataCompra = resto.data_prevista;
    dataPrevista = resolvido.data!;
  }

  const linha: Database["public"]["Tables"]["lancamentos"]["Insert"] = {
    ...resto,
    data_prevista: dataPrevista,
    data_compra: dataCompra,
    cartao_id,
    pago,
    valor_pago: pago ? resto.valor_previsto : null,
    data_pagamento: pago ? dataPrevista : null,
  };

  if (arquivo && arquivo.size > 0) {
    const erroAnexo = validarAnexo(arquivo);
    if (erroAnexo) return { error: erroAnexo };

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Sessão expirada — recarregue a página e tente de novo." };

    const id = randomUUID();
    const caminho = caminhoAnexo(auth.user.id, id, dataPrevista, arquivo.name);
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
  const { nome, tipo, categoria_id, valor_previsto, data_prevista, metodo, cartao_id } = parsed.data;
  const supabase = await createClient();

  let dataPrevistaFinal = data_prevista;
  let dataCompra: string | null = null;
  if (cartao_id) {
    const resolvido = await resolverDataFatura(supabase, cartao_id, data_prevista);
    if (resolvido.error) return { error: resolvido.error };
    dataCompra = data_prevista;
    dataPrevistaFinal = resolvido.data!;
  }

  const { error } = await supabase
    .from("lancamentos")
    .update({
      nome,
      tipo,
      categoria_id,
      valor_previsto,
      data_prevista: dataPrevistaFinal,
      data_compra: dataCompra,
      metodo,
      cartao_id,
    })
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

  const { nome, tipo, categoria_id, valor_total, parcelas, juros_mensal, data_primeira_parcela, metodo, cartao_id } =
    parsed.data;
  const valores = calcularParcelas({ valorTotal: valor_total, parcelas, jurosMensal: juros_mensal });
  const parcelamentoId = randomUUID();
  const supabase = await createClient();

  // Com cartão, a data digitada é a DATA DA COMPRA da 1ª parcela — resolve
  // pra fatura em que ela cai e soma um mês por parcela a partir dali (cada
  // parcela seguinte cai na fatura do mês seguinte, mesmo dia de
  // vencimento). Sem cartão, a data já é o vencimento da 1ª parcela.
  let dataBase = data_primeira_parcela;
  let dataCompra: string | null = null;
  if (cartao_id) {
    const resolvido = await resolverDataFatura(supabase, cartao_id, data_primeira_parcela);
    if (resolvido.error) return { error: resolvido.error };
    dataCompra = data_primeira_parcela;
    dataBase = resolvido.data!;
  }

  const linhas = valores.map((valor, index) => ({
    nome: `${nome} (${index + 1}/${parcelas})`,
    tipo,
    categoria_id,
    valor_previsto: valor,
    data_prevista: addMonthsToDate(dataBase, index),
    data_compra: dataCompra,
    metodo,
    cartao_id,
    parcelamento_id: parcelamentoId,
    parcela_numero: index + 1,
    parcela_total: parcelas,
  }));

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
  // Separado do "não encontrado": um erro de verdade aqui (ex.: coluna
  // anexo_path não existe, porque a migration 08_anexos.sql ainda não foi
  // aplicada) não pode virar essa mensagem genérica — sem o motivo real,
  // fica impossível saber que falta rodar a migration.
  if (erroBusca) return { error: erroBusca.message };
  if (!lancamento) return { error: "Lançamento não encontrado." };

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
  if (erroBusca) return { error: erroBusca.message };
  if (!lancamento) return { error: "Lançamento não encontrado." };

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
