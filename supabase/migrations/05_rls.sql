-- RLS em todas as tabelas, filtrando por user_id = auth.uid(). Login único
-- hoje, mas a spec pede isso justamente para funcionar certo se um dia virar
-- multiusuário — nenhuma linha aparece ou é editável fora do dono.
--
-- `(select auth.uid())` em vez de `auth.uid()` solto: o Postgres enxerga o
-- subselect como um initplan e avalia uma vez por statement, não uma vez por
-- linha — recomendação do próprio linter de performance do Supabase.

alter table grupos enable row level security;
alter table subgrupos enable row level security;
alter table contas_fixas enable row level security;
alter table lancamentos enable row level security;

create policy "grupos_select_own" on grupos for select using (user_id = (select auth.uid()));
create policy "grupos_insert_own" on grupos for insert with check (user_id = (select auth.uid()));
create policy "grupos_update_own" on grupos for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "grupos_delete_own" on grupos for delete using (user_id = (select auth.uid()));

create policy "subgrupos_select_own" on subgrupos for select using (user_id = (select auth.uid()));
create policy "subgrupos_insert_own" on subgrupos for insert with check (user_id = (select auth.uid()));
create policy "subgrupos_update_own" on subgrupos for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "subgrupos_delete_own" on subgrupos for delete using (user_id = (select auth.uid()));

create policy "contas_fixas_select_own" on contas_fixas for select using (user_id = (select auth.uid()));
create policy "contas_fixas_insert_own" on contas_fixas for insert with check (user_id = (select auth.uid()));
create policy "contas_fixas_update_own" on contas_fixas for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "contas_fixas_delete_own" on contas_fixas for delete using (user_id = (select auth.uid()));

create policy "lancamentos_select_own" on lancamentos for select using (user_id = (select auth.uid()));
create policy "lancamentos_insert_own" on lancamentos for insert with check (user_id = (select auth.uid()));
create policy "lancamentos_update_own" on lancamentos for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "lancamentos_delete_own" on lancamentos for delete using (user_id = (select auth.uid()));

-- RLS controla quais linhas aparecem; sem estes GRANTs a Data API nem chega
-- a tentar (o papel `authenticated` não tem privilégio nenhum por padrão).
grant usage on schema public to authenticated;
grant select, insert, update, delete on grupos, subgrupos, contas_fixas, lancamentos to authenticated;
grant execute on function gerar_previstos_do_mes(date) to authenticated;
grant execute on function contas_do_mes(date) to authenticated;
