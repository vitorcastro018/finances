"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItems } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

export function AppNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile: barra inferior fixa. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background sm:hidden">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Desktop: sidebar. */}
      <nav className="hidden w-56 shrink-0 border-r p-4 sm:flex sm:flex-col sm:gap-1">
        <span className="mb-4 px-2 text-lg font-semibold">Finanças</span>
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/60",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
