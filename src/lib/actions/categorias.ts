"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { categoriaSchema, type CategoriaInput } from "@/lib/validation/categorias";

export type ActionResult = { error?: string };

export async function criarCategoria(input: CategoriaInput): Promise<ActionResult> {
  const parsed = categoriaSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.from("categorias").insert(parsed.data);
  if (error) return { error: traduzErro(error) };

  revalidatePath("/categorias");
  return {};
}

export async function editarCategoria(id: string, input: CategoriaInput): Promise<ActionResult> {
  const parsed = categoriaSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.from("categorias").update(parsed.data).eq("id", id);
  if (error) return { error: traduzErro(error) };

  revalidatePath("/categorias");
  return {};
}

export async function apagarCategoria(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("categorias").delete().eq("id", id);
  if (error) return { error: traduzErro(error) };

  revalidatePath("/categorias");
  return {};
}

/** Traduz os erros mais comuns do Postgres para uma mensagem que faz sentido na UI. */
function traduzErro(error: { code?: string; message: string }): string {
  if (error.code === "23503") {
    return "Apague ou mude a categoria das contas fixas/lançamentos que a usam antes de apagá-la.";
  }
  if (error.code === "23505") {
    return "Já existe uma categoria com esse nome.";
  }
  return error.message;
}
