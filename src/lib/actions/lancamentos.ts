"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

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

function revalidarTelas() {
  revalidatePath("/");
  revalidatePath("/lancamentos");
}

/** Usado tanto por "adicionar conta avulsa deste mês" quanto pelo CRUD de /lancamentos.
 * Marcado como já pago na criação (checkbox do formulário) usa o próprio
 * valor/data previstos como valor/data reais — pra ajustar pra um valor
 * diferente depois, é só usar "Marcar como pago" na lista mesmo. */
export async function criarLancamento(input: LancamentoInput): Promise<ActionResult> {
  const parsed = lancamentoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { pago, ...resto } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("lancamentos").insert({
    ...resto,
    pago,
    valor_pago: pago ? resto.valor_previsto : null,
    data_pagamento: pago ? resto.data_prevista : null,
  });
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
