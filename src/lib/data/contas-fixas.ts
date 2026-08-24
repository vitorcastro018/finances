import { createClient } from "@/lib/supabase/server";
import type { ContaFixaRow } from "@/lib/supabase/types";

export async function getContasFixas(): Promise<ContaFixaRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("contas_fixas").select("*").order("nome");
  if (error) throw error;
  return data ?? [];
}
