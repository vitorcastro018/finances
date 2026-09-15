import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";

/** Checa o header `Authorization: Bearer <API_KEY>` de toda rota em
 * src/app/api/** (a API pro agente do n8n — não passa pelo login normal,
 * proxy.ts deixa /api fora do redirect). Devolve a resposta de erro pronta
 * pra já retornar direto quando falhar, ou null quando pode seguir. */
export function verificarApiKey(request: NextRequest): NextResponse | null {
  if (!env.API_KEY || !env.APP_USER_ID || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "API não configurada — faltam API_KEY, APP_USER_ID ou SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente." },
      { status: 500 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${env.API_KEY}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  return null;
}
