"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { cartaoSchema, type CartaoInput } from "@/lib/validation/cartoes";
import type { ActionResult } from "@/lib/actions/categorias";

function revalidarTelas() {
  revalidatePath("/");
  revalidatePath("/lancamentos");
  revalidatePath("/contas-fixas");
  revalidatePath("/cartoes");
}

export async function criarCartao(input: CartaoInput): Promise<ActionResult> {
  const parsed = cartaoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.from("cartoes").insert(parsed.data);
  if (error) return { error: traduzErro(error) };

  revalidarTelas();
  return {};
}

export async function editarCartao(id: string, input: CartaoInput): Promise<ActionResult> {
  const parsed = cartaoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.from("cartoes").update(parsed.data).eq("id", id);
  if (error) return { error: traduzErro(error) };

  revalidarTelas();
  return {};
}

/** Desativa/reativa — nunca apaga, mesmo motivo de contas fixas: não perder
 * o histórico de lançamentos já ligados a este cartão. Desativado só some
 * do <select> de novos lançamentos/contas fixas. */
export async function alternarAtivoCartao(id: string, ativo: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("cartoes").update({ ativo }).eq("id", id);
  if (error) return { error: error.message };

  revalidarTelas();
  return {};
}

function traduzErro(error: { code?: string; message: string }): string {
  if (error.code === "23505") return "Já existe um cartão com esse nome.";
  return error.message;
}
