-- Alter the notebooks table to store the custom cover image URL or name
alter table public.notebooks add column if not exists cover text;
