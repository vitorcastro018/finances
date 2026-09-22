import type { SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import type { Database, TipoLancamento } from "@/lib/supabase/types";

/** O agente do n8n fala em nome de categoria ("Mercado"), não em uuid — essa
 * função resolve o nome pra categoria_id (só entre as categorias do mesmo
 * tipo, e só as categorias de topo, como o resto do app já faz pro <select>
 * "simples"). Comparação sem diferenciar maiúscula/minúscula, pra não exigir
 * que o agente acerte a grafia exata. */
/** `status` distingue "categoria não existe" (400, erro de quem chamou) de
 * "não consegui nem consultar" (500, problema daqui pra baixo) — sem isso os
 * dois viravam sempre 400 nas rotas que chamam essa função. */
export async function resolverCategoriaPorNome(
  admin: SupabaseClient<Database>,
  nome: string,
  tipo: TipoLancamento,
): Promise<{ id: string; nome: string } | { erro: string; status: 400 | 500 }> {
  const { data, error } = await admin
    .from("categorias")
    .select("id, nome")
    .eq("user_id", env.APP_USER_ID!)
    .eq("tipo", tipo)
    .is("categoria_pai_id", null);
  if (error) return { erro: error.message, status: 500 };

  const alvo = nome.trim().toLowerCase();
  const encontrada = data.find((c) => c.nome.toLowerCase() === alvo);
  if (encontrada) return { id: encontrada.id, nome: encontrada.nome };

  const disponiveis = data.map((c) => c.nome).join(", ") || "nenhuma cadastrada";
  return {
    erro: `Categoria "${nome}" não encontrada entre as de ${tipo}. Disponíveis: ${disponiveis}.`,
    status: 400,
  };
}

/** Como `resolverCategoriaPorNome`, mas pra achar o PAI ao criar uma
 * subcategoria — `tipo` é opcional aqui porque o nome de uma categoria de
 * topo já é único o bastante pra achar sozinho, sem o agente precisar saber
 * de antemão se ela é de entrada ou saída. Devolve também `tipo`/`cor`, que
 * a subcategoria nova herda do pai (mesma regra do SubcategoriaFormDialog
 * na tela: tipo e cor não são escolhidos à parte). */
export async function buscarCategoriaTopoPorNome(
  admin: SupabaseClient<Database>,
  nome: string,
  tipo?: TipoLancamento,
): Promise<{ id: string; nome: string; tipo: TipoLancamento; cor: string } | { erro: string; status: 400 | 500 }> {
  let query = admin
    .from("categorias")
    .select("id, nome, tipo, cor")
    .eq("user_id", env.APP_USER_ID!)
    .is("categoria_pai_id", null);
  if (tipo) query = query.eq("tipo", tipo);
  const { data, error } = await query;
  if (error) return { erro: error.message, status: 500 };

  const alvo = nome.trim().toLowerCase();
  const encontrada = data.find((c) => c.nome.toLowerCase() === alvo);
  if (encontrada) return encontrada;

  const disponiveis = data.map((c) => c.nome).join(", ") || "nenhuma cadastrada";
  return {
    erro: `Categoria "${nome}" não encontrada${tipo ? ` entre as de ${tipo}` : ""}. Disponíveis: ${disponiveis}.`,
    status: 400,
  };
}

/** Como `resolverCategoriaPorNome`, mas pra achar uma SUBcategoria dentro de
 * uma categoria de topo já resolvida — o agente do n8n fala em nome
 * ("Hortifruti"), não em uuid. `categoriaPaiNome` é só pra deixar a mensagem
 * de erro clara (a busca em si usa `categoriaPaiId`). */
export async function resolverSubcategoriaPorNome(
  admin: SupabaseClient<Database>,
  nome: string,
  categoriaPaiId: string,
  categoriaPaiNome: string,
): Promise<{ id: string; nome: string } | { erro: string; status: 400 | 500 }> {
  const { data, error } = await admin
    .from("categorias")
    .select("id, nome")
    .eq("user_id", env.APP_USER_ID!)
    .eq("categoria_pai_id", categoriaPaiId);
  if (error) return { erro: error.message, status: 500 };

  const alvo = nome.trim().toLowerCase();
  const encontrada = data.find((c) => c.nome.toLowerCase() === alvo);
  if (encontrada) return { id: encontrada.id, nome: encontrada.nome };

  const disponiveis = data.map((c) => c.nome).join(", ") || "nenhuma cadastrada";
  return {
    erro: `Subcategoria "${nome}" não encontrada em "${categoriaPaiNome}". Disponíveis: ${disponiveis}.`,
    status: 400,
  };
}
