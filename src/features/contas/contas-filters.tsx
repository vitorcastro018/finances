"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GrupoRow } from "@/lib/supabase/types";

export function ContasFilters({ grupos }: { grupos: GrupoRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === "todos") params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Select value={searchParams.get("situacao") ?? "todos"} onValueChange={(v) => setParam("situacao", v)}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Toda situação</SelectItem>
          <SelectItem value="pago">Pago</SelectItem>
          <SelectItem value="a_vencer">A vencer</SelectItem>
          <SelectItem value="atrasado">Atrasado</SelectItem>
        </SelectContent>
      </Select>

      <Select value={searchParams.get("grupo") ?? "todos"} onValueChange={(v) => setParam("grupo", v)}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todo grupo</SelectItem>
          {grupos.map((g) => (
            <SelectItem key={g.id} value={g.id}>
              {g.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
