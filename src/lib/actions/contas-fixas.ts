"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { contaFixaSchema, type ContaFixaInput } from "@/lib/validation/contas-fixas";
import type { ActionResult } from "@/lib/actions/categorias";

export async function criarContaFixa(input: ContaFixaInput): Promise<ActionResult> {
  const parsed = contaFixaSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.from("contas_fixas").insert(parsed.data);
  if (error) return { error: error.message };

  revalidatePath("/contas-fixas");
  return {};
}

export async function editarContaFixa(id: string, input: ContaFixaInput): Promise<ActionResult> {
  const parsed = contaFixaSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.from("contas_fixas").update(parsed.data).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/contas-fixas");
  return {};
}

/** Desativa/reativa — nunca apaga, para não perder o histórico já gerado. */
export async function alternarAtivaContaFixa(id: string, ativa: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("contas_fixas").update({ ativa }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/contas-fixas");
  return {};
}

/** Botão manual "gerar previstos deste mês" — chama a função idempotente do banco. */
export async function gerarPrevistosDoMes(referencia: string): Promise<ActionResult & { geradas?: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("gerar_previstos_do_mes", { referencia });
  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/contas");
  revalidatePath("/contas-fixas");
  return { geradas: data?.length ?? 0 };
}
