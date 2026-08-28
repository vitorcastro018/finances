-- Subcategorias: uma categoria pode ter uma categoria "pai" (ex.: "Mercado"
-- dentro de "Alimentação"). Sem tabela nova — subcategoria é só uma
-- categoria com categoria_pai_id preenchido. A UI restringe a um nível só
-- (não deixa criar subcategoria de subcategoria).
alter table categorias
  add column categoria_pai_id uuid references categorias (id) on delete cascade;

create index categorias_pai_id_idx on categorias (categoria_pai_id) where categoria_pai_id is not null;
