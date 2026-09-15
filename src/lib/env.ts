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
    // Só usadas por src/app/api/** (a API pro agente do n8n) — opcionais
    // porque o resto do app funciona sem elas. Sem sessão de navegador vindo
    // do n8n, essas rotas usam a service role key (ignora RLS) mais um
    // user_id fixo, e uma chave própria (API_KEY) no lugar do cookie de
    // login. Ver src/lib/supabase/admin.ts e src/lib/api/auth.ts.
    //
    // `env.ts` inteiro é avaliado uma vez só, na primeira importação — e
    // quase todo Server Component/Action importa (via lib/supabase/server.ts)
    // — então uma validação estrita aqui (ex.: `.uuid()`) que falhe por um
    // valor mal configurado derrubaria o app inteiro, não só a API. Por
    // isso essas três ficam só como "não vazio": um APP_USER_ID mal
    // formatado vira erro contido dentro da própria rota (a consulta no
    // Supabase falha ali, sem propagar).
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    APP_USER_ID: z.string().min(1).optional(),
    API_KEY: z.string().min(1).optional(),
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
      SUPABASE_SERVICE_ROLE_KEY: value.SUPABASE_SERVICE_ROLE_KEY,
      APP_USER_ID: value.APP_USER_ID,
      API_KEY: value.API_KEY,
    };
  });

export const env = envSchema.parse({
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  APP_TIMEZONE: process.env.APP_TIMEZONE,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  APP_USER_ID: process.env.APP_USER_ID,
  API_KEY: process.env.API_KEY,
});
