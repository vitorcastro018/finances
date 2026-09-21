import { NextResponse, type NextRequest } from "next/server";

import { verificarApiKey } from "@/lib/api/auth";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/** GET /api/cartoes — cartões ativos, pro agente saber que nomes pode usar
 * no campo `cartao` de POST/GET /api/lancamentos (resolverCartaoPorNome). */
export async function GET(request: NextRequest) {
  const erroAuth = verificarApiKey(request);
  if (erroAuth) return erroAuth;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cartoes")
    .select("id, nome, dia_fechamento, dia_vencimento")
    .eq("user_id", env.APP_USER_ID!)
    .eq("ativo", true)
    .order("nome");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
