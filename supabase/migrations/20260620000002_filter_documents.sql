-- Add status column to documents table to support background indexing indicator
alter table public.documents add column if not exists status text default 'completed';

-- Recreate match_document_chunks to support filtering by specific document IDs
create or replace function match_document_chunks (
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  filter_notebook_id uuid default null,
  filter_document_ids uuid[] default null
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
language plpgsql stable
as $$
begin
  return query
  select
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  join public.documents d on d.id = dc.document_id
  where (filter_notebook_id is null or d.notebook_id = filter_notebook_id)
    and (filter_document_ids is null or dc.document_id = any(filter_document_ids))
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
end;
$$;
