"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  identificador: z.string().trim().min(1, "Informe seu e-mail ou usuário"),
  senha: z.string().min(1, "Senha obrigatória"),
});

export type LoginState = { error?: string } | undefined;

/** Resolve um nome de usuário (o que não tem "@") pro e-mail cadastrado,
 * lendo o user_metadata de auth.users com a service role key — só ela
 * enxerga essa tabela. `listUsers()` sem paginação é seguro aqui porque o
 * app é de usuário único (mesma premissa do resto do código); se um dia
 * virar multiusuário isso precisa de paginação. Sem SUPABASE_SERVICE_ROLE_KEY
 * configurada, login por usuário não funciona — só por e-mail. */
async function resolverEmailPorUsuario(usuario: string): Promise<string | null> {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return null;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) return null;

  const alvo = usuario.toLowerCase();
  const encontrado = data.users.find((u) => {
    const username = u.user_metadata?.username;
    return typeof username === "string" && username.toLowerCase() === alvo;
  });
  return encontrado?.email ?? null;
}

export async function entrar(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    identificador: formData.get("identificador"),
    senha: formData.get("senha"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { identificador, senha } = parsed.data;
  const email = identificador.includes("@") ? identificador : await resolverEmailPorUsuario(identificador);
  if (!email) {
    return { error: "E-mail/usuário ou senha incorretos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) {
    return { error: "E-mail/usuário ou senha incorretos." };
  }

  redirect("/");
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
