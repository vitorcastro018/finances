import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 renomeou `middleware.ts` para `proxy.ts` (mesma função, nome
// novo) — ver node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.
export async function proxy(request: NextRequest) {
  const { response, authenticated } = await updateSession(request);

  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname.startsWith("/login");

  if (!authenticated && !isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (authenticated && isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Roda em tudo, exceto assets estáticos, otimização de imagem e a API
    // (/api/**) — essa não usa cookie de sessão, tem autenticação própria
    // por API key (ver src/lib/api/auth.ts), então cairia sempre no
    // redirect de login se passasse por aqui.
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
};
