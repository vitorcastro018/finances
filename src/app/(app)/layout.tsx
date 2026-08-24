import type { ReactNode } from "react";

import { AppNav } from "@/components/layout/app-nav";
import { Button } from "@/components/ui/button";
import { sair } from "@/lib/actions/auth";
import { getAuthUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getAuthUser();

  return (
    <div className="flex min-h-screen flex-col sm:flex-row">
      <AppNav />
      <div className="flex flex-1 flex-col">
        <header className="hidden items-center justify-between border-b px-6 py-3 sm:flex">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <form action={sair}>
            <Button type="submit" variant="ghost" size="sm">
              Sair
            </Button>
          </form>
        </header>
        <main className="flex-1 pb-16 sm:pb-0">{children}</main>
      </div>
    </div>
  );
}
