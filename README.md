# Finanças

MVP web de controle financeiro pessoal — responde "o que eu tenho pra pagar
esse mês". Só o software web, sem integração com nada externo. Next.js (App
Router) + Tailwind + shadcn/ui + Supabase (Auth + Postgres), deploy na
Vercel.

Login único (você), sem cadastro público — o usuário é criado direto no
Supabase. RLS filtra tudo por `user_id`, então o app já funciona certo se um
dia virar multiusuário.

## Stack

- Next.js 16 (App Router, TypeScript) — **atenção**: esta versão renomeou
  `middleware.ts` para `proxy.ts` (mesma função, nome novo). Se algo em Next
  parecer não bater com o que você conhece, confira
  `node_modules/next/dist/docs/` antes de assumir bug.
- Supabase: Postgres, Auth e RLS (`@supabase/ssr`, sem client-side auth).
- Tailwind CSS 4 + shadcn/ui (componentes copiados manualmente em
  `src/components/ui` — o registro `ui.shadcn.com` não é alcançável em todo
  ambiente de build, então os componentes já estão no repo em vez de serem
  buscados via CLI).
- Todo acesso ao Supabase acontece em Server Component ou Server Action — o
  navegador nunca recebe a chave, por isso nenhuma env leva o prefixo
  `NEXT_PUBLIC_`.

## Banco de dados

Schema simplificado (MVP): `categorias` (lista única, sem hierarquia
grupo/subgrupo), `contas_fixas`, `lancamentos`, as funções `contas_do_mes()` /
`gerar_previstos_do_mes()`, e RLS em tudo. As migrations em
`supabase/migrations/` são o registro do que deve ser aplicado — rodá-las em
ordem num projeto Supabase novo (ou resetado) reproduz o schema inteiro.

| Arquivo                | O que faz                                                    |
| ------------------------ | ------------------------------------------------------------- |
| `01_categorias.sql`      | tabela `categorias` (nome, tipo entrada/saída, cor) + trigger de `updated_at` |
| `02_contas_fixas.sql`    | o molde do que se repete (aluguel, assinaturas...)             |
| `03_lancamentos.sql`     | histórico + índice único que garante idempotência por mês      |
| `04_functions.sql`       | `gerar_previstos_do_mes()` e `contas_do_mes()`                 |
| `05_rls.sql`             | RLS + grants para o papel `authenticated`, com `(select auth.uid())` já otimizado e `search_path` fixo nas funções |

### Criar seu usuário

Não há cadastro público. Em **Authentication → Users → Add user → Create new
user**, com e-mail e senha, e **marque "Auto Confirm User"** (sem isso o login
depende de SMTP, que o projeto não tem configurado).

### Onde achar URL e chave

| Variável                    | Onde está no painel do Supabase |
| ---------------------------- | -------------------------------- |
| `SUPABASE_URL`               | Project Settings → Data API      |
| `SUPABASE_PUBLISHABLE_KEY`   | Project Settings → API Keys      |

Use a chave **publicável** (ou "anon", em projetos mais antigos — preencha uma
das duas). **Nunca a `service_role`**: ela ignora o RLS.

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencha SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY
npm run dev
```

## Deploy

Projeto Vercel `finances`, ligado a este repositório — cada push em `main`
gera um deploy. Configure as mesmas três variáveis de `.env.example` no
painel da Vercel (Project Settings → Environment Variables) antes do primeiro
deploy real.

## Regras de negócio

- **Nunca duplica o previsto do mês**: `gerar_previstos_do_mes()` é
  idempotente via índice único (`contas_fixa_id` + mês).
- **Pago é editável para trás e para frente**: marcar e desmarcar como pago
  são ações separadas e sempre disponíveis.
- **Valor previsto ≠ valor pago**: os dois ficam gravados; a UI mostra os dois
  quando diferem.
- **Tudo em `America/Sao_Paulo`**: vencimentos, "mês corrente" e "atrasado"
  seguem esse fuso, não UTC.

## O que este app não faz

MVP enxuto, de propósito: sem chat/agente conversacional, sem app mobile,
sem integração com banco/open finance, sem cadastro público de usuários. É
puramente CRUD e visualização — cadastrar categorias, contas fixas e
lançamentos, ver o que falta pagar no mês e exportar em CSV.
