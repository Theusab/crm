create extension if not exists vector with schema extensions;

create table public.knowledge_documents (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  file_name    text not null,
  content_type text not null check (content_type in ('application/pdf', 'text/plain')),
  chunk_count  int not null check (chunk_count > 0),
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create table public.knowledge_chunks (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  chunk_index int not null check (chunk_index >= 0),
  content     text not null,
  embedding   extensions.vector(1536) not null,
  unique (document_id, chunk_index)
);
create index knowledge_chunks_embedding_idx on public.knowledge_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

create table public.whatsapp_inbox_events (
  provider_message_id text primary key,
  lead_id             uuid references public.leads(id) on delete set null,
  status              text not null default 'processing'
    check (status in ('processing', 'processed', 'ignored', 'failed')),
  error               text,
  created_at          timestamptz not null default now(),
  processed_at        timestamptz
);
create index whatsapp_inbox_events_status_idx on public.whatsapp_inbox_events (status, created_at desc);

alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.whatsapp_inbox_events enable row level security;

revoke all on public.knowledge_documents, public.knowledge_chunks, public.whatsapp_inbox_events from anon;
grant select, insert, update, delete on public.knowledge_documents, public.knowledge_chunks to authenticated;
grant select on public.whatsapp_inbox_events to authenticated;
grant all on public.knowledge_documents, public.knowledge_chunks, public.whatsapp_inbox_events to service_role;

create policy knowledge_documents_admin on public.knowledge_documents for all to authenticated
  using ((select public.app_role()) = 'admin')
  with check ((select public.app_role()) = 'admin');
create policy knowledge_chunks_admin on public.knowledge_chunks for all to authenticated
  using ((select public.app_role()) = 'admin')
  with check ((select public.app_role()) = 'admin');
create policy whatsapp_inbox_events_select_admin on public.whatsapp_inbox_events for select to authenticated
  using ((select public.app_role()) = 'admin');

create or replace function public.match_knowledge_chunks(
  query_embedding extensions.vector(1536),
  match_threshold double precision default 0.35,
  match_count int default 5
)
returns table (
  document_title text,
  content text,
  similarity double precision
)
language sql stable security invoker
set search_path = public, extensions
as $$
  select d.title, c.content, 1 - (c.embedding <=> query_embedding) as similarity
  from public.knowledge_chunks c
  join public.knowledge_documents d on d.id = c.document_id
  where 1 - (c.embedding <=> query_embedding) >= match_threshold
  order by c.embedding <=> query_embedding
  limit greatest(1, least(match_count, 10));
$$;
revoke all on function public.match_knowledge_chunks(extensions.vector, double precision, int) from public, anon, authenticated;
grant execute on function public.match_knowledge_chunks(extensions.vector, double precision, int) to service_role;
