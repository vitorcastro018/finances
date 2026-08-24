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
    // Roda em tudo, exceto assets estáticos e a otimização de imagem — sem
    // isso, CSS/JS/imagens ficam bloqueados atrás do redirect de login.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
