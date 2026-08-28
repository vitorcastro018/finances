import { createClient } from "@/lib/supabase/server";
import type { CategoriaRow } from "@/lib/supabase/types";

/** Todas as categorias do usuário, ordenadas por nome. Usada em toda tela
 * que precisa popular um <select> de categoria, além de /categorias. */
export async function getCategorias(): Promise<CategoriaRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categorias").select("*").order("nome");
  if (error) throw error;
  return data ?? [];
}
