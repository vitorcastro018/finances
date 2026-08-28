import { z } from "zod";

const hexColor = /^#[0-9a-fA-F]{6}$/;

export const categoriaSchema = z.object({
  nome: z.string().trim().min(1, "Nome obrigatório").max(60),
  tipo: z.enum(["entrada", "saida"]),
  cor: z.string().regex(hexColor, "Cor inválida (use #rrggbb)").default("#64748b"),
  // Presente = isso é uma subcategoria (ex.: "Mercado" dentro de
  // "Alimentação"). A UI só deixa esse campo ser setado ao criar via
  // SubcategoriaFormDialog; editar uma categoria existente sempre reenvia o
  // valor atual pra não "soltar" ela do pai sem querer.
  categoria_pai_id: z
    .union([z.string().uuid(), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value ? value : null)),
});

export type CategoriaInput = z.input<typeof categoriaSchema>;
