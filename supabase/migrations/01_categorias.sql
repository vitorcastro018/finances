-- Taxonomia simplificada: uma lista só de categorias (sem hierarquia
-- grupo/subgrupo). MVP: cada categoria já diz se é entrada ou saída.

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

create table categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (btrim(nome) <> ''),
  tipo tipo_lancamento not null,
  cor text not null default '#64748b',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, nome)
);

create trigger categorias_set_updated_at
  before update on categorias
  for each row execute function set_updated_at();
