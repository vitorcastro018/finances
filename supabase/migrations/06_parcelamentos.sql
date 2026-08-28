-- Compras parceladas (ex.: TV em 6x). Cada parcela é um lançamento normal —
-- estas três colunas só agrupam as parcelas da mesma compra e guardam a
-- posição (n/total), sem precisar de uma tabela nova.
alter table lancamentos
  add column parcelamento_id uuid,
  add column parcela_numero smallint check (parcela_numero > 0),
  add column parcela_total smallint check (parcela_total > 0);

create index lancamentos_parcelamento_idx
  on lancamentos (parcelamento_id)
  where parcelamento_id is not null;
