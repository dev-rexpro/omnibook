-- Create storage bucket named `document-pdfs`
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('document-pdfs', 'document-pdfs', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

-- Set up storage RLS policies for document-pdfs bucket
create policy "Allow authenticated insert of document-pdfs"
on storage.objects for insert
to authenticated
with check (bucket_id = 'document-pdfs');

create policy "Allow authenticated select of document-pdfs"
on storage.objects for select
to authenticated
using (bucket_id = 'document-pdfs');

create policy "Allow authenticated delete of document-pdfs"
on storage.objects for delete
to authenticated
using (bucket_id = 'document-pdfs');

-- Update the documents table to include storage_path
alter table public.documents add column if not exists storage_path text;

-- Create the chats table
create table if not exists public.chats (
    id uuid default gen_random_uuid() primary key,
    notebook_id uuid references public.notebooks(id) on delete cascade not null,
    title text not null default 'New Chat',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create the messages table
create table if not exists public.messages (
    id uuid default gen_random_uuid() primary key,
    chat_id uuid references public.chats(id) on delete cascade not null,
    role text not null check (role in ('user', 'model')),
    content text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS) on chats and messages
alter table public.chats enable row level security;
alter table public.messages enable row level security;

-- Create RLS Policies for chats
create policy "Users can perform all actions on chats inside their notebooks"
on public.chats for all
to authenticated
using (
    exists (
        select 1 from public.notebooks
        where public.notebooks.id = public.chats.notebook_id
        and public.notebooks.user_id = auth.uid()
    )
)
with check (
    exists (
        select 1 from public.notebooks
        where public.notebooks.id = public.chats.notebook_id
        and public.notebooks.user_id = auth.uid()
    )
);

-- Create RLS Policies for messages
create policy "Users can perform all actions on messages inside their chats"
on public.messages for all
to authenticated
using (
    exists (
        select 1 from public.chats
        join public.notebooks on public.notebooks.id = public.chats.notebook_id
        where public.chats.id = public.messages.chat_id
        and public.notebooks.user_id = auth.uid()
    )
)
with check (
    exists (
        select 1 from public.chats
        join public.notebooks on public.notebooks.id = public.chats.notebook_id
        where public.chats.id = public.messages.chat_id
        and public.notebooks.user_id = auth.uid()
    )
);
