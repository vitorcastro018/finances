"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatMonthLabel, monthRefToParam, shiftMonthRef } from "@/lib/timezone";

export function MonthSwitcher({ referencia }: { referencia: string }) {
  const pathname = usePathname();
  const anterior = monthRefToParam(shiftMonthRef(referencia, -1));
  const proximo = monthRefToParam(shiftMonthRef(referencia, 1));

  return (
    <div className="flex items-center justify-center gap-3">
      <Button asChild variant="outline" size="icon">
        <Link href={`${pathname}?ref=${anterior}`} aria-label="Mês anterior">
          <ChevronLeft className="size-4" />
        </Link>
      </Button>
      <span className="min-w-40 text-center text-sm font-medium">{formatMonthLabel(referencia)}</span>
      <Button asChild variant="outline" size="icon">
        <Link href={`${pathname}?ref=${proximo}`} aria-label="Próximo mês">
          <ChevronRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}
