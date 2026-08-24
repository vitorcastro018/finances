"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { grupoSchema, subgrupoSchema, type GrupoInput, type SubgrupoInput } from "@/lib/validation/categorias";

export type ActionResult = { error?: string };

export async function criarGrupo(input: GrupoInput): Promise<ActionResult> {
  const parsed = grupoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.from("grupos").insert(parsed.data);
  if (error) return { error: traduzErro(error) };

  revalidatePath("/categorias");
  return {};
}

export async function editarGrupo(id: string, input: GrupoInput): Promise<ActionResult> {
  const parsed = grupoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.from("grupos").update(parsed.data).eq("id", id);
  if (error) return { error: traduzErro(error) };

  revalidatePath("/categorias");
  return {};
}

export async function apagarGrupo(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("grupos").delete().eq("id", id);
  if (error) return { error: traduzErro(error) };

  revalidatePath("/categorias");
  return {};
}

export async function criarSubgrupo(input: SubgrupoInput): Promise<ActionResult> {
  const parsed = subgrupoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.from("subgrupos").insert(parsed.data);
  if (error) return { error: traduzErro(error) };

  revalidatePath("/categorias");
  return {};
}

export async function editarSubgrupo(id: string, nome: string): Promise<ActionResult> {
  const parsed = subgrupoSchema.shape.nome.safeParse(nome);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.from("subgrupos").update({ nome: parsed.data }).eq("id", id);
  if (error) return { error: traduzErro(error) };

  revalidatePath("/categorias");
  return {};
}

export async function apagarSubgrupo(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("subgrupos").delete().eq("id", id);
  if (error) return { error: traduzErro(error) };

  revalidatePath("/categorias");
  return {};
}

/** Traduz os erros mais comuns do Postgres para uma mensagem que faz sentido na UI. */
function traduzErro(error: { code?: string; message: string }): string {
  if (error.code === "23503") {
    return "Apague ou mova os subgrupos deste grupo antes de apagá-lo.";
  }
  if (error.code === "23505") {
    return "Já existe um item com esse nome.";
  }
  return error.message;
}
