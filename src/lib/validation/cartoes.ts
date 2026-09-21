import { z } from "zod";

export const cartaoSchema = z.object({
  nome: z.string().trim().min(1, "Nome obrigatório").max(60),
  dia_fechamento: z.coerce.number().int().min(1).max(31),
  dia_vencimento: z.coerce.number().int().min(1).max(31),
  ativo: z.coerce.boolean().default(true),
});

export type CartaoInput = z.input<typeof cartaoSchema>;
