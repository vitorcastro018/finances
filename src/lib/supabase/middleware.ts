import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { env } from "@/lib/env";

/**
 * Renova a sessão e devolve a resposta com os cookies atualizados, além de
 * dizer se o request está autenticado.
 *
 * Precisa rodar no proxy: Server Components não conseguem escrever cookie,
 * então sem este passo o refresh token nunca é gravado de volta e a sessão
 * expira sozinha. Os cookies têm que ir para o `request` (para o restante da
 * cadeia enxergar a sessão nova) e para a `response` (para o navegador
 * guardar) — só um dos dois "funciona" localmente e derruba a sessão em
 * produção.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, authenticated: !!user };
}
