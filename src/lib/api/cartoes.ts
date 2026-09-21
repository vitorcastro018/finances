import type { SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/** Como `resolverCategoriaPorNome` (lib/api/categorias.ts), mas pra cartão —
 * o agente do n8n fala em nome ("Nubank"), não em uuid. Só resolve entre os
 * cartões ativos, mesmo filtro do <select> no formulário
 * (lancamento-form-dialog.tsx: `cartoes.filter((c) => c.ativo)`). */
export async function resolverCartaoPorNome(
  admin: SupabaseClient<Database>,
  nome: string,
): Promise<
  | { id: string; nome: string; dia_fechamento: number; dia_vencimento: number }
  | { erro: string; status: 400 | 500 }
> {
  const { data, error } = await admin
    .from("cartoes")
    .select("id, nome, dia_fechamento, dia_vencimento")
    .eq("user_id", env.APP_USER_ID!)
    .eq("ativo", true);
  if (error) return { erro: error.message, status: 500 };

  const alvo = nome.trim().toLowerCase();
  const encontrado = data.find((c) => c.nome.toLowerCase() === alvo);
  if (encontrado) return encontrado;

  const disponiveis = data.map((c) => c.nome).join(", ") || "nenhum cadastrado";
  return {
    erro: `Cartão "${nome}" não encontrado entre os ativos. Disponíveis: ${disponiveis}.`,
    status: 400,
  };
}
