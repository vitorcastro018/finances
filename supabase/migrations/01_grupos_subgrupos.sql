-- Taxonomia da planilha: grupos (Despesas Fixas, Despesas Variáveis...) e
-- seus subgrupos (Aluguel, Água...). Ver `04-grupos-subgrupos` na spec.

create extension if not exists pgcrypto;

create type tipo_lancamento as enum ('entrada', 'saida');

create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table grupos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (btrim(nome) <> ''),
  tipo tipo_lancamento not null,
  cor text not null default '#64748b',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, nome)
);

create trigger grupos_set_updated_at
  before update on grupos
  for each row execute function set_updated_at();

-- Apagar um grupo com subgrupos falha (FK sem cascade) em vez de derrubar
-- tudo por engano — a spec pede aviso, não apagar em cascata silenciosa.
create table subgrupos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  grupo_id uuid not null references grupos (id) on delete restrict,
  nome text not null check (btrim(nome) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (grupo_id, nome)
);

create index subgrupos_grupo_id_idx on subgrupos (grupo_id);
create index subgrupos_user_id_idx on subgrupos (user_id);

create trigger subgrupos_set_updated_at
  before update on subgrupos
  for each row execute function set_updated_at();
