import { Badge } from "@/components/ui/badge";
import type { Situacao } from "@/lib/supabase/types";

const rotulo: Record<Situacao, string> = {
  pago: "Pago",
  a_vencer: "A vencer",
  atrasado: "Atrasado",
};

const variante: Record<Situacao, "success" | "warning" | "destructive"> = {
  pago: "success",
  a_vencer: "warning",
  atrasado: "destructive",
};

export function SituacaoBadge({ situacao }: { situacao: Situacao }) {
  return <Badge variant={variante[situacao]}>{rotulo[situacao]}</Badge>;
}
