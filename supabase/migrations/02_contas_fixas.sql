-- O molde do que se repete (aluguel, assinaturas...) — separado das contas
-- do mês, que são a instância já gerada em `lancamentos`.

create table contas_fixas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (btrim(nome) <> ''),
  categoria_id uuid not null references categorias (id) on delete restrict,
  -- null = "variável" (ex.: conta de luz) — mostrado como tal na UI.
  valor_previsto numeric(12, 2) check (valor_previsto >= 0),
  dia_vencimento smallint not null check (dia_vencimento between 1 and 31),
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contas_fixas_categoria_id_idx on contas_fixas (categoria_id);
create index contas_fixas_ativa_idx on contas_fixas (user_id, ativa);

create trigger contas_fixas_set_updated_at
  before update on contas_fixas
  for each row execute function set_updated_at();
