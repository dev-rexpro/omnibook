-- Add citations column to messages table to persist interactive citations
alter table public.messages add column if not exists citations jsonb;
