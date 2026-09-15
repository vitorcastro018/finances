-- Anexo (foto/PDF do comprovante) por lançamento — guardado no Storage do
-- próprio projeto Supabase, não no Drive: sem OAuth externo, mesma
-- autenticação que o resto do app já usa, e o RLS de storage.objects segue
-- o mesmo padrão de "cada um só vê o que é seu" das tabelas.

alter table lancamentos
  add column anexo_path text,
  add column anexo_nome text;

-- Bucket privado (public = false): o arquivo só é acessível por link
-- assinado, gerado na hora sob demanda (ver obterUrlAnexo em
-- lib/actions/lancamentos.ts), nunca por URL pública direta.
insert into storage.buckets (id, name, public)
values ('anexos', 'anexos', false)
on conflict (id) do nothing;

-- Caminho de cada objeto é "<user_id>/<ano>/<mes>/<lancamento_id>.<ext>" —
-- storage.foldername(name) devolve os segmentos da pasta, então o primeiro
-- (índice 1) é sempre o dono. Mesmo `(select auth.uid())` das outras
-- políticas (05_rls.sql), pelo mesmo motivo de performance.
create policy "anexos_select_own" on storage.objects for select using (
  bucket_id = 'anexos' and (select auth.uid())::text = (storage.foldername(name))[1]
);

create policy "anexos_insert_own" on storage.objects for insert with check (
  bucket_id = 'anexos' and (select auth.uid())::text = (storage.foldername(name))[1]
);

create policy "anexos_update_own" on storage.objects for update using (
  bucket_id = 'anexos' and (select auth.uid())::text = (storage.foldername(name))[1]
) with check (
  bucket_id = 'anexos' and (select auth.uid())::text = (storage.foldername(name))[1]
);

create policy "anexos_delete_own" on storage.objects for delete using (
  bucket_id = 'anexos' and (select auth.uid())::text = (storage.foldername(name))[1]
);
