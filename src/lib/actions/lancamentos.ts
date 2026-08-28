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
  revalidatePath("/contas");
  revalidatePath("/lancamentos");
}

/** Usado tanto por "adicionar conta avulsa deste mês" quanto pelo CRUD de /lancamentos. */
export async function criarLancamento(input: LancamentoInput): Promise<ActionResult> {
  const parsed = lancamentoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.from("lancamentos").insert(parsed.data);
  if (error) return { error: error.message };

  revalidarTelas();
  return {};
}

export async function editarLancamento(id: string, input: LancamentoInput): Promise<ActionResult> {
  const parsed = lancamentoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.from("lancamentos").update(parsed.data).eq("id", id);
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
