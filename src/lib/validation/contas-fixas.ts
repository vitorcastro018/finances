import { z } from "zod";

export const contaFixaSchema = z.object({
  nome: z.string().trim().min(1, "Nome obrigatório").max(80),
  categoria_id: z.string().uuid("Escolha uma categoria"),
  // Vazio/undefined = "variável" (valor previsto muda todo mês).
  valor_previsto: z
    .union([z.coerce.number().min(0), z.literal("")])
    .optional()
    .transform((value) => (value === "" || value === undefined ? null : value)),
  // Sem cartão: o dia do vencimento em si. Com cartão: o dia em que a
  // cobrança entra no cartão — gerar_previstos_do_mes() calcula em qual
  // fatura isso cai (ver data_fatura() no banco).
  dia_vencimento: z.coerce.number().int().min(1).max(31),
  ativa: z.coerce.boolean().default(true),
  cartao_id: z
    .union([z.string().uuid(), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value ? value : null)),
});

// z.input (não z.infer/output): os campos usam z.coerce, então quem chama a
// action ainda pode mandar string (valor de <input>) — a coerção acontece no
// safeParse, dentro da própria action.
export type ContaFixaInput = z.input<typeof contaFixaSchema>;
