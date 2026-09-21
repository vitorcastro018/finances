import type { ReactNode } from "react";
import { LogOut, User } from "lucide-react";

import { AppNav } from "@/components/layout/app-nav";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { sair } from "@/lib/actions/auth";
import { getAuthUser } from "@/lib/supabase/server";

function MenuPerfil({ email }: { email: string | undefined }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="rounded-full" aria-label="Meu perfil">
          <User className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {email && <DropdownMenuLabel>{email}</DropdownMenuLabel>}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <form action={sair} className="w-full">
            <button type="submit" className="flex w-full items-center gap-2 text-left">
              <LogOut className="size-4" /> Sair
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getAuthUser();

  return (
    <div className="flex min-h-screen flex-col sm:flex-row">
      <AppNav />
      <div className="flex flex-1 flex-col">
        {/* Celular: barra fixa só com a marca e o menu de perfil — a
            navegação já mora na barra inferior (AppNav), então não
            repete aqui. */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background px-4 py-3 sm:hidden">
          <span className="text-base font-semibold">Finanças</span>
          <MenuPerfil email={user?.email} />
        </header>
        <header className="hidden items-center justify-end border-b px-6 py-3 sm:flex">
          <MenuPerfil email={user?.email} />
        </header>
        <main className="flex-1 pb-16 sm:pb-0">{children}</main>
      </div>
    </div>
  );
}
