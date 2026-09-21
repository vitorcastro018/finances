import { createClient } from "@/lib/supabase/server";
import type { CartaoRow } from "@/lib/supabase/types";

export async function getCartoes(): Promise<CartaoRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("cartoes").select("*").order("nome");
  if (error) throw error;
  return data ?? [];
}
