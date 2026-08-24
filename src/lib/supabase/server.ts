import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 *
 * Um cliente novo por requisição: cada um carrega a sessão de quem está
 * pedindo, então reaproveitar entre requisições vazaria dados de um usuário
 * para outro (aqui login único, mas o RLS já filtra por user_id).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(env.SUPABASE_URL, env.SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component não pode escrever cookie — o proxy (src/proxy.ts)
          // roda antes e renova a sessão, então aqui o erro é esperado.
        }
      },
    },
  });
}

/** Usuário autenticado da sessão atual, ou null. */
export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
