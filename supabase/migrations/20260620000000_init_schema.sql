-- Enable the pgvector extension to work with embeddings
create extension if not exists vector;

-- Create the notebooks table
create table if not exists public.notebooks (
    id uuid default gen_random_uuid() primary key,
    user_id uuid not null,
    title text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create the documents table
create table if not exists public.documents (
    id uuid default gen_random_uuid() primary key,
    notebook_id uuid references public.notebooks(id) on delete cascade not null,
    filename text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create the document_chunks table
create table if not exists public.document_chunks (
    id uuid default gen_random_uuid() primary key,
    document_id uuid references public.documents(id) on delete cascade not null,
    content text not null,
    embedding vector(384) not null
);

-- Create HNSW index for vector similarity search (recommended for performance)
create index on public.document_chunks using hnsw (embedding vector_cosine_ops);

-- Enable Row Level Security (RLS) on all tables
alter table public.notebooks enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;

-- Create RLS Policies
-- 1. Notebooks
create policy "Users can perform all actions on their own notebooks"
on public.notebooks for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 2. Documents
create policy "Users can perform all actions on documents inside their notebooks"
on public.documents for all
to authenticated
using (
    exists (
        select 1 from public.notebooks
        where public.notebooks.id = public.documents.notebook_id
        and public.notebooks.user_id = auth.uid()
    )
)
with check (
    exists (
        select 1 from public.notebooks
        where public.notebooks.id = public.documents.notebook_id
        and public.notebooks.user_id = auth.uid()
    )
);

-- 3. Document Chunks
create policy "Users can perform all actions on chunks belonging to their documents"
on public.document_chunks for all
to authenticated
using (
    exists (
        select 1 from public.documents
        join public.notebooks on public.notebooks.id = public.documents.notebook_id
        where public.documents.id = public.document_chunks.document_id
        and public.notebooks.user_id = auth.uid()
    )
)
with check (
    exists (
        select 1 from public.documents
        join public.notebooks on public.notebooks.id = public.documents.notebook_id
        where public.documents.id = public.document_chunks.document_id
        and public.notebooks.user_id = auth.uid()
    )
);

-- Create similarity search match function (RPC)
create or replace function match_document_chunks (
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  filter_notebook_id uuid default null
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
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
end;
$$;
