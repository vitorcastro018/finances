-- Histórico completo (o que hoje é a planilha) e também as contas do mês:
-- uma linha aqui tanto pode vir de `gerar_previstos_do_mes()` (origem
-- 'recorrente') quanto ser lançada direto pelo bot do Telegram ou pela web.

create type origem_lancamento as enum ('telegram', 'web', 'recorrente');

-- `date_trunc('month', date)` não é IMMUTABLE nesta versão do Postgres (só a
-- variante com timestamp/timestamptz é), então não pode aparecer numa
-- expressão de índice. Esta função, sim — usada no índice único abaixo e nas
-- duas funções em `04_functions.sql` para que ambos concordem no que é "o
-- mesmo mês".
create or replace function mes_referencia(d date)
returns date
language sql
immutable
set search_path = public
as $$
  select make_date(extract(year from d)::int, extract(month from d)::int, 1);
$$;

create table lancamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Presente só quando a linha veio de uma conta fixa. `set null` em vez de
  -- cascade: apagar o molde não deve apagar o histórico já lançado.
  contas_fixa_id uuid references contas_fixas (id) on delete set null,
  nome text not null check (btrim(nome) <> ''),
  tipo tipo_lancamento not null,
  grupo_id uuid not null references grupos (id) on delete restrict,
  subgrupo_id uuid references subgrupos (id) on delete set null,
  valor_previsto numeric(12, 2) not null check (valor_previsto >= 0),
  -- Valor previsto ≠ valor pago (conta de luz variável, por exemplo) — os
  -- dois convivem, nunca um sobrescreve o outro.
  valor_pago numeric(12, 2) check (valor_pago >= 0),
  data_prevista date not null,
  data_pagamento date,
  pago boolean not null default false,
  metodo text,
  origem origem_lancamento not null default 'web',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lancamentos_data_prevista_idx on lancamentos (user_id, data_prevista);
create index lancamentos_grupo_idx on lancamentos (grupo_id);
create index lancamentos_subgrupo_idx on lancamentos (subgrupo_id);
create index lancamentos_pago_idx on lancamentos (user_id, pago);

-- Garante a idempotência de `gerar_previstos_do_mes()`: no máximo uma linha
-- gerada por conta fixa e por mês (o "nunca duplicar o previsto do mês" da
-- spec vira uma restrição do banco, não uma checagem em código).
create unique index lancamentos_contas_fixa_por_mes_idx
  on lancamentos (contas_fixa_id, mes_referencia(data_prevista))
  where contas_fixa_id is not null;

create trigger lancamentos_set_updated_at
  before update on lancamentos
  for each row execute function set_updated_at();
