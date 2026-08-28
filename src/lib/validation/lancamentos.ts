import { z } from "zod";

export const lancamentoSchema = z.object({
  nome: z.string().trim().min(1, "Nome obrigatório").max(120),
  tipo: z.enum(["entrada", "saida"]),
  categoria_id: z.string().uuid("Escolha uma categoria"),
  valor_previsto: z.coerce.number().min(0, "Valor não pode ser negativo"),
  data_prevista: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  metodo: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((value) => (value ? value : null)),
});

// z.input, pelo mesmo motivo de ContaFixaInput: valor_previsto usa z.coerce.
export type LancamentoInput = z.input<typeof lancamentoSchema>;

/** Marcar como pago pede valor real (pode diferir do previsto) e data. */
export const marcarPagoSchema = z.object({
  id: z.string().uuid(),
  valor_pago: z.coerce.number().min(0, "Valor não pode ser negativo"),
  data_pagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
});

export type MarcarPagoInput = z.infer<typeof marcarPagoSchema>;

export const filtroLancamentosSchema = z.object({
  de: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  categoria_id: z.string().uuid().optional(),
  tipo: z.enum(["entrada", "saida"]).optional(),
  pago: z.enum(["true", "false"]).optional(),
  busca: z.string().trim().max(120).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
});

export type FiltroLancamentos = z.infer<typeof filtroLancamentosSchema>;
