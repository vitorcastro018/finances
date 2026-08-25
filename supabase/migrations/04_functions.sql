-- `gerar_previstos_do_mes`: gera, para cada conta fixa ativa, o lançamento
-- previsto do mês de `referencia` — idempotente via
-- `lancamentos_contas_fixa_por_mes_idx` (ON CONFLICT DO NOTHING), então
-- rodar de novo no mesmo mês nunca duplica.
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
    valor_previsto, data_prevista, pago, origem
  )
  select
    cf.user_id,
    cf.id,
    cf.nome,
    c.tipo,
    cf.categoria_id,
    coalesce(cf.valor_previsto, 0),
    -- Clampa o dia de vencimento ao último dia do mês (dia 31 em abril -> 30).
    make_date(
      extract(year from v_mes_inicio)::int,
      extract(month from v_mes_inicio)::int,
      least(cf.dia_vencimento, v_ultimo_dia)
    ),
    false,
    'recorrente'
  from contas_fixas cf
  join categorias c on c.id = cf.categoria_id
  where cf.ativa and cf.user_id = auth.uid()
  on conflict (contas_fixa_id, mes_referencia(data_prevista)) where contas_fixa_id is not null
  do nothing
  returning lancamentos.*;
end;
$$;

comment on function gerar_previstos_do_mes(date) is
  'security invoker (padrão): roda com os privilégios de quem chama, então o'
  ' RLS de contas_fixas/categorias/lancamentos se aplica normalmente — não'
  ' precisa de security definer nem de filtrar manualmente por role.';

-- `contas_do_mes`: "o que eu tenho pra pagar esse mês" — junta lançamento
-- com categoria e calcula a situação (pago / a_vencer / atrasado) no fuso
-- America/Sao_Paulo, para o dashboard e a tela `/contas` não recalcularem
-- nada no cliente.
create or replace function contas_do_mes(referencia date)
returns table (
  id uuid,
  contas_fixa_id uuid,
  nome text,
  tipo tipo_lancamento,
  categoria_id uuid,
  categoria_nome text,
  categoria_cor text,
  valor_previsto numeric,
  valor_pago numeric,
  data_prevista date,
  data_pagamento date,
  pago boolean,
  metodo text,
  origem origem_lancamento,
  situacao text
)
language sql
stable
set search_path = public
as $$
  select
    l.id,
    l.contas_fixa_id,
    l.nome,
    l.tipo,
    l.categoria_id,
    c.nome as categoria_nome,
    c.cor as categoria_cor,
    l.valor_previsto,
    l.valor_pago,
    l.data_prevista,
    l.data_pagamento,
    l.pago,
    l.metodo,
    l.origem,
    case
      when l.pago then 'pago'
      when l.data_prevista < (now() at time zone 'America/Sao_Paulo')::date then 'atrasado'
      else 'a_vencer'
    end as situacao
  from lancamentos l
  join categorias c on c.id = l.categoria_id
  where l.user_id = auth.uid()
    and mes_referencia(l.data_prevista) = mes_referencia(referencia)
  order by l.data_prevista;
$$;
