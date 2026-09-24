import { z } from "zod";

import { currentMonthRef, monthRefToParam } from "@/lib/timezone";

export const lancamentoSchema = z.object({
  nome: z.string().trim().min(1, "Nome obrigatório").max(120),
  tipo: z.enum(["entrada", "saida"]),
  categoria_id: z.string().uuid("Escolha uma categoria"),
  valor_previsto: z.coerce.number().min(0, "Valor não pode ser negativo"),
  // Quando cartao_id vem preenchido, isso é a DATA DA COMPRA, não o
  // vencimento — a action resolve a data de vencimento real (a fatura em
  // que a compra cai) antes de salvar. Ver calcularDataFatura em
  // lib/cartoes.ts e o uso em lib/actions/lancamentos.ts.
  data_prevista: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  metodo: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((value) => (value ? value : null)),
  // Só o formulário de criação manda isso (checkbox "Já paguei/recebi") —
  // editarLancamento ignora o campo pra não pisar num pagamento já
  // registrado com valor/data reais via marcarComoPago.
  pago: z.boolean().optional().default(false),
  cartao_id: z
    .union([z.string().uuid(), z.literal(""), z.null()])
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

/** Compra parcelada (ex.: TV em 6x) — gera N lançamentos de uma vez, ver
 * `criarParcelamento` em `lib/actions/lancamentos.ts`. */
export const parcelamentoSchema = z.object({
  nome: z.string().trim().min(1, "Nome obrigatório").max(120),
  tipo: z.enum(["entrada", "saida"]),
  categoria_id: z.string().uuid("Escolha uma categoria"),
  valor_total: z.coerce.number().positive("Valor deve ser maior que zero"),
  parcelas: z.coerce.number().int().min(2, "Mínimo 2 parcelas").max(60, "Máximo 60 parcelas"),
  // Vazio = sem juros (divisão simples do valor total).
  juros_mensal: z.coerce.number().min(0, "Juros não pode ser negativo").max(100, "Juros muito alto").optional().default(0),
  // Quando cartao_id vem preenchido, isso é a DATA DA COMPRA da 1ª parcela —
  // a action resolve a fatura em que ela cai (calcularDataFatura) e soma um
  // mês por parcela a partir dali, mesma lógica de lancamentoSchema.
  data_primeira_parcela: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  metodo: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((value) => (value ? value : null)),
  cartao_id: z
    .union([z.string().uuid(), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value ? value : null)),
});

export type ParcelamentoInput = z.input<typeof parcelamentoSchema>;

export const COLUNAS_ORDENAVEIS = [
  "situacao",
  "data",
  "nome",
  "tipo",
  "categoria",
  "valor",
  "metodo",
  "origem",
] as const;

export type ColunaOrdenavel = (typeof COLUNAS_ORDENAVEIS)[number];

// O <select> "Toda categoria"/"Entrada/Saída"/"Pago/Não pago" manda o campo
// vazio ("") quando fica na opção default — sem isso, `z.string().uuid()` e
// os `z.enum(...)` abaixo rejeitam "" (não é undefined) e o parse inteiro
// falha, derrubando a página a cada filtro. Trata "" como "não veio".
const filtroLancamentosSchemaBase = z.object({
  // "yyyy-mm" de um mês específico, ou "todos" pra ver o período inteiro.
  // Sem o parâmetro na URL, cai no mês atual — é assim que a tela sempre
  // abre já filtrada em "agora", como pedido.
  mes: z
    .union([z.literal("todos"), z.string().regex(/^\d{4}-\d{2}$/, "Mês inválido")])
    .default(() => monthRefToParam(currentMonthRef())),
  categoria_id: z.string().uuid().optional(),
  tipo: z.enum(["entrada", "saida"]).optional(),
  pago: z.enum(["true", "false"]).optional(),
  cartao_id: z.string().uuid().optional(),
  busca: z.string().trim().max(120).optional(),
  // Padrão pedido: maior valor primeiro (valor + desc).
  ordenar: z.enum(COLUNAS_ORDENAVEIS).default("valor"),
  direcao: z.enum(["asc", "desc"]).default("desc"),
});

export const filtroLancamentosSchema = z.preprocess((valor) => {
  if (typeof valor !== "object" || valor === null) return valor;
  return Object.fromEntries(Object.entries(valor as Record<string, unknown>).filter(([, v]) => v !== ""));
}, filtroLancamentosSchemaBase);

export type FiltroLancamentos = z.infer<typeof filtroLancamentosSchemaBase>;
