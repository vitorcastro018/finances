import { LayoutDashboard, Receipt, Tags, Repeat } from "lucide-react";

export const navItems = [
  { href: "/", label: "Início", icon: LayoutDashboard },
  { href: "/lancamentos", label: "Lançamentos", icon: Receipt },
  { href: "/categorias", label: "Categorias", icon: Tags },
  { href: "/contas-fixas", label: "Fixas", icon: Repeat },
] as const;
