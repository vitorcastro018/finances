-- Cartão de crédito: cada compra vira um lançamento normal (mesma ideia do
-- parcelamento), só que `data_prevista` não é a data da compra — é a data
-- de vencimento da fatura em que ela cai, calculada a partir do dia de
-- fechamento/vencimento do cartão. Com isso o resto do app (filtro por mês,
-- "Previsto a pagar", saldo, os gráficos) já funciona sem nenhuma lógica
-- nova: a fatura de um cartão num mês é só "os lançamentos daquele cartão
-- com data_prevista naquele mês" — nenhuma tabela de "fatura" separada.

create table cartoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (btrim(nome) <> ''),
  dia_fechamento smallint not null check (dia_fechamento between 1 and 31),
  dia_vencimento smallint not null check (dia_vencimento between 1 and 31),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, nome)
);

create trigger cartoes_set_updated_at
  before update on cartoes
  for each row execute function set_updated_at();

alter table lancamentos add column cartao_id uuid references cartoes (id) on delete set null;
alter table contas_fixas add column cartao_id uuid references cartoes (id) on delete set null;

-- Guarda a data da compra separada da data de vencimento calculada — sem
-- isso, editar um lançamento de cartão não teria como saber "quando foi a
-- compra" pra reoferecer no formulário (só data_prevista, que já é o
-- vencimento, ficaria salva). Só é usada quando cartao_id não é nulo.
alter table lancamentos add column data_compra date;
comment on column lancamentos.data_compra is
  'Data da compra no cartão (antes de calcular em qual fatura ela cai). Só populado quando cartao_id não é nulo — o formulário reusa isso pra reoferecer a data certa ao editar, em vez da data_prevista já calculada.';

-- Calcula em qual fatura uma compra cai a partir do dia de fechamento e de
-- vencimento do cartão. Mesma lógica existe em TypeScript
-- (calcularDataFatura, em src/lib/cartoes.ts) pro preview instantâneo no
-- formulário e pra resolver a data ao criar/editar um lançamento manual —
-- aqui é usada só por gerar_previstos_do_mes(), que roda dentro do banco.
create or replace function data_fatura(data_compra date, dia_fechamento int, dia_vencimento int)
returns date
language plpgsql
immutable
set search_path = public
as $$
declare
  v_fechamento date := date_trunc('month', data_compra)::date;
  v_vencimento date;
  v_ultimo_dia int;
begin
  -- Comprou depois do fechamento -> cai na fatura que fecha no mês seguinte.
  if extract(day from data_compra)::int > dia_fechamento then
    v_fechamento := (v_fechamento + interval '1 month')::date;
  end if;

  -- Dia de vencimento menor que o de fechamento (numericamente) só faz
  -- sentido se vencer no mês seguinte ao fechamento (ex.: fecha dia 25,
  -- vence dia 5 do mês depois). Vencimento >= fechamento -> mesmo mês.
  v_vencimento := v_fechamento;
  if dia_vencimento < dia_fechamento then
    v_vencimento := (v_vencimento + interval '1 month')::date;
  end if;

  v_ultimo_dia := extract(day from (v_vencimento + interval '1 month - 1 day'))::int;
  return make_date(extract(year from v_vencimento)::int, extract(month from v_vencimento)::int, least(dia_vencimento, v_ultimo_dia));
end;
$$;

-- `gerar_previstos_do_mes()` usava mes_referencia(data_prevista) pra
-- garantir no máximo um previsto gerado por conta fixa e por mês — isso
-- quebra agora: uma conta fixa presa a um cartão pode ter data_prevista num
-- mês diferente do mês em que foi gerada (a cobrança de setembro pode cair
-- na fatura de outubro). `competencia` guarda o mês em que a conta fixa foi
-- *gerada* (sempre igual a `referencia`), separado de quando ela *vence* —
-- a unicidade passa a ser sobre isso, não mais sobre data_prevista.
alter table lancamentos add column competencia date;
comment on column lancamentos.competencia is
  'Mês de referência da conta fixa que gerou este lançamento (gerar_previstos_do_mes). Não é necessariamente o mês de data_prevista — um cartão pode empurrar o vencimento pro mês seguinte. Só populado pra origem = recorrente.';

drop index lancamentos_contas_fixa_por_mes_idx;
create unique index lancamentos_contas_fixa_por_mes_idx
  on lancamentos (contas_fixa_id, competencia)
  where contas_fixa_id is not null;

create or replace function gerar_previstos_do_mes(referencia date)
returns setof lancamentos
language plpgsql
volatile
set search_path = public
as $$
declare
  v_mes_inicio date := date_trunc('month', referencia)::date;
  v_ultimo_dia int := extract(day from (v_mes_inicio + interval '1 month - 1 day'))::int;
begin
  return query
  insert into lancamentos (
    user_id, contas_fixa_id, nome, tipo, categoria_id,
    valor_previsto, data_prevista, data_compra, pago, origem, cartao_id, competencia
  )
  select
    cf.user_id,
    cf.id,
    cf.nome,
    c.tipo,
    cf.categoria_id,
    coalesce(cf.valor_previsto, 0),
    case
      when cf.cartao_id is not null then data_fatura(
        make_date(extract(year from v_mes_inicio)::int, extract(month from v_mes_inicio)::int, least(cf.dia_vencimento, v_ultimo_dia)),
        ct.dia_fechamento,
        ct.dia_vencimento
      )
      else make_date(extract(year from v_mes_inicio)::int, extract(month from v_mes_inicio)::int, least(cf.dia_vencimento, v_ultimo_dia))
    end,
    case
      when cf.cartao_id is not null
        then make_date(extract(year from v_mes_inicio)::int, extract(month from v_mes_inicio)::int, least(cf.dia_vencimento, v_ultimo_dia))
      else null
    end,
    false,
    'recorrente',
    cf.cartao_id,
    v_mes_inicio
  from contas_fixas cf
  join categorias c on c.id = cf.categoria_id
  left join cartoes ct on ct.id = cf.cartao_id
  where cf.ativa and cf.user_id = auth.uid()
  on conflict (contas_fixa_id, competencia) where contas_fixa_id is not null
  do nothing
  returning lancamentos.*;
end;
$$;

alter table cartoes enable row level security;

create policy "cartoes_select_own" on cartoes for select using (user_id = (select auth.uid()));
create policy "cartoes_insert_own" on cartoes for insert with check (user_id = (select auth.uid()));
create policy "cartoes_update_own" on cartoes for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "cartoes_delete_own" on cartoes for delete using (user_id = (select auth.uid()));

grant select, insert, update, delete on cartoes to authenticated;
-- gerar_previstos_do_mes() roda como quem chama (security invoker, o
-- padrão) e chama data_fatura() por dentro — sem este grant, a chamada
-- aninhada falha mesmo com o grant já existente em gerar_previstos_do_mes.
grant execute on function data_fatura(date, int, int) to authenticated;
