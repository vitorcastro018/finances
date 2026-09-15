import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Cliente com a service role key — ignora RLS por completo. Só pode ser
 * usado dentro de src/app/api/** (a API pro agente do n8n), nunca em Server
 * Component/Action normal — essas continuam com o cliente de sessão em
 * lib/supabase/server.ts, que respeita RLS.
 *
 * Como não existe sessão de usuário vindo do n8n, todo filtro/insert nas
 * rotas de API precisa passar `user_id: env.APP_USER_ID` explicitamente —
 * sem RLS pra fazer isso sozinho, esquecer o filtro vazaria/misturaria
 * dados (hoje inofensivo, é usuário único, mas o padrão certo é este).
 */
export function createAdminClient() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada — a API não tem como funcionar sem ela.");
  }
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
