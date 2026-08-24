import { z } from "zod";

// Todo o acesso ao Supabase acontece em Server Component ou Server Action —
// o navegador nunca recebe a chave — então nenhuma variável leva o prefixo
// NEXT_PUBLIC_. Isso vale tanto na Vercel quanto em qualquer outro host.
const envSchema = z
  .object({
    SUPABASE_URL: z.string().url(),
    // O painel do Supabase renomeou "anon" para "publishable"; aceito as
    // duas para não depender de qual nome aparece no seu projeto.
    SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
    SUPABASE_ANON_KEY: z.string().min(1).optional(),
    APP_TIMEZONE: z.string().default("America/Sao_Paulo"),
  })
  .transform((value, ctx) => {
    const key = value.SUPABASE_PUBLISHABLE_KEY ?? value.SUPABASE_ANON_KEY;
    if (!key) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Defina SUPABASE_PUBLISHABLE_KEY (ou SUPABASE_ANON_KEY).",
        path: ["SUPABASE_PUBLISHABLE_KEY"],
      });
      return z.NEVER;
    }
    return {
      SUPABASE_URL: value.SUPABASE_URL,
      SUPABASE_KEY: key,
      APP_TIMEZONE: value.APP_TIMEZONE,
    };
  });

export const env = envSchema.parse({
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  APP_TIMEZONE: process.env.APP_TIMEZONE,
});
