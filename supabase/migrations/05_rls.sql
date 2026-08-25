-- RLS em todas as tabelas, filtrando por user_id = auth.uid(). Login único
-- hoje, mas isso já deixa o app pronto se um dia virar multiusuário —
-- nenhuma linha aparece ou é editável fora do dono.
--
-- `(select auth.uid())` em vez de `auth.uid()` solto: o Postgres enxerga o
-- subselect como um initplan e avalia uma vez por statement, não uma vez por
-- linha — recomendação do próprio linter de performance do Supabase.

alter table categorias enable row level security;
alter table contas_fixas enable row level security;
alter table lancamentos enable row level security;

create policy "categorias_select_own" on categorias for select using (user_id = (select auth.uid()));
create policy "categorias_insert_own" on categorias for insert with check (user_id = (select auth.uid()));
create policy "categorias_update_own" on categorias for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "categorias_delete_own" on categorias for delete using (user_id = (select auth.uid()));

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
grant select, insert, update, delete on categorias, contas_fixas, lancamentos to authenticated;
grant execute on function gerar_previstos_do_mes(date) to authenticated;
grant execute on function contas_do_mes(date) to authenticated;
