import { z } from "zod";

const hexColor = /^#[0-9a-fA-F]{6}$/;

export const categoriaSchema = z.object({
  nome: z.string().trim().min(1, "Nome obrigatório").max(60),
  tipo: z.enum(["entrada", "saida"]),
  cor: z.string().regex(hexColor, "Cor inválida (use #rrggbb)").default("#64748b"),
});

export type CategoriaInput = z.infer<typeof categoriaSchema>;
