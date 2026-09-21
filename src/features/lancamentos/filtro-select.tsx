"use client";

import type { ReactNode } from "react";

/** <select> genérico dos filtros de /lancamentos (categoria, tipo, pago,
 * cartão) — filtra sozinho ao trocar, sem precisar clicar em "Filtrar",
 * igual ao MesFilterSelect. `form.requestSubmit()` reenvia o mesmo GET
 * nativo com todos os campos preenchidos, então os outros filtros já
 * escolhidos continuam valendo. */
export function FiltroSelect({
  name,
  defaultValue,
  className,
  children,
}: {
  name: string;
  defaultValue: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className={className}
    >
      {children}
    </select>
  );
}
