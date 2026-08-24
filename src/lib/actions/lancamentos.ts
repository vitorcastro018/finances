"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  lancamentoSchema,
  marcarPagoSchema,
  type LancamentoInput,
  type MarcarPagoInput,
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
