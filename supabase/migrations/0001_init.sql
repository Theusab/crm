-- BlackCore CRM | schema inicial (Supabase / PostgreSQL 15+)
-- Single-tenant com 3 papéis: admin, manager, sales.
-- Webhooks e jobs escrevem via service_role (ignora RLS); o app usa a anon key + sessão do usuário.

create extension if not exists pg_trgm;

-- ───────── Tipos ─────────
create type public.user_role      as enum ('admin', 'manager', 'sales');
create type public.lead_status    as enum ('open', 'won', 'lost');
create type public.activity_type  as enum ('note','call','email','whatsapp_in','whatsapp_out',
                                           'stage_change','assignment','score_updated','webhook_received','system');
create type public.webhook_status as enum ('received', 'processed', 'duplicate', 'failed');

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- ───────── 1. Usuários (profiles espelham auth.users) ─────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  avatar_url  text,
  role        public.user_role not null default 'sales',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Papel do usuário logado (security definer evita recursão de RLS em profiles)
create or replace function public.app_role() returns public.user_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;
revoke all on function public.app_role() from public;
grant execute on function public.app_role() to authenticated;

-- Novo usuário no Auth vira profile; o PRIMEIRO usuário do sistema vira admin
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    case when exists (select 1 from public.profiles) then 'sales'::public.user_role
         else 'admin'::public.user_role end
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Ninguém (além de admin) muda o próprio cargo ou reativa a si mesmo
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.role is distinct from old.role or new.is_active is distinct from old.is_active)
     and auth.uid() is not null
     and coalesce(public.app_role()::text, '') <> 'admin' then
    raise exception 'Apenas admins podem alterar cargo ou status';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ───────── 2. Estágios do funil ─────────
create table public.pipeline_stages (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  position     int  not null,
  color        text not null default '#71717a',
  probability  smallint not null default 0 check (probability between 0 and 100),
  is_won       boolean not null default false,
  is_lost      boolean not null default false,
  created_at   timestamptz not null default now(),
  check (not (is_won and is_lost))
);
create index pipeline_stages_position_idx on public.pipeline_stages (position);

insert into public.pipeline_stages (name, slug, position, color, probability, is_won, is_lost) values
  ('Novo',          'novo',          10, '#71717a',  5, false, false),
  ('Qualificado',   'qualificado',   20, '#38bdf8', 25, false, false),
  ('Contato feito', 'contato-feito', 30, '#a78bfa', 40, false, false),
  ('Proposta',      'proposta',      40, '#f97316', 60, false, false),
  ('Negociação',    'negociacao',    50, '#facc15', 80, false, false),
  ('Ganho',         'ganho',         60, '#22c55e',100, true,  false),
  ('Perdido',       'perdido',       70, '#ef4444',  0, false, true);

-- ───────── 3. Leads ─────────
create table public.leads (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null check (length(trim(name)) > 0),
  email              text,                       -- sempre salvo em minúsculas pela aplicação
  phone              text,                       -- E.164, ex.: +5514999998888
  company            text,
  job_title          text,
  source             text not null default 'manual',
  external_id        text,                       -- id na origem (idempotência)
  stage_id           uuid not null references public.pipeline_stages(id) on delete restrict,
  position           double precision not null default 0,  -- ordem no Kanban (indexação fracionária)
  status             public.lead_status not null default 'open',
  owner_id           uuid references public.profiles(id) on delete set null,
  created_by         uuid references public.profiles(id) on delete set null,  -- null = webhook/sistema
  value              numeric(12,2) check (value >= 0),
  score              smallint check (score between 0 and 100),
  score_reason       text,
  score_model        text,
  scored_at          timestamptz,
  tags               text[] not null default '{}',
  custom             jsonb not null default '{}'::jsonb,
  raw_payload        jsonb,
  last_contacted_at  timestamptz,
  next_follow_up_at  timestamptz,
  loss_reason        text,
  closed_at          timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (email is not null or phone is not null)
);
create unique index leads_email_uq    on public.leads (lower(email)) where email is not null;
create unique index leads_phone_uq    on public.leads (phone)        where phone is not null;
create unique index leads_source_ext_uq on public.leads (source, external_id) where external_id is not null;
create index leads_board_idx     on public.leads (stage_id, position);
create index leads_owner_idx     on public.leads (owner_id);
create index leads_score_idx     on public.leads (score desc nulls last);
create index leads_followup_idx  on public.leads (next_follow_up_at) where next_follow_up_at is not null and status = 'open';
create index leads_name_trgm     on public.leads using gin (name gin_trgm_ops);
create index leads_company_trgm  on public.leads using gin (company gin_trgm_ops);
create trigger leads_updated before update on public.leads
  for each row execute function public.set_updated_at();

-- ───────── 4. Atividades / logs (append-only) ─────────
create table public.activities (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  actor_id    uuid references public.profiles(id) on delete set null,  -- null = sistema/IA
  type        public.activity_type not null,
  title       text not null,
  body        text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index activities_lead_idx on public.activities (lead_id, created_at desc);

-- Troca de estágio: atualiza status/closed_at e registra a atividade automaticamente
create or replace function public.on_lead_stage_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare s public.pipeline_stages; o public.pipeline_stages;
begin
  if new.stage_id is distinct from old.stage_id then
    select * into s from public.pipeline_stages where id = new.stage_id;
    select * into o from public.pipeline_stages where id = old.stage_id;
    new.status    := case when s.is_won then 'won' when s.is_lost then 'lost' else 'open' end;
    new.closed_at := case when s.is_won or s.is_lost then now() else null end;
    insert into public.activities (lead_id, actor_id, type, title, metadata)
    values (new.id, auth.uid(), 'stage_change', o.name || ' → ' || s.name,
            jsonb_build_object('from', old.stage_id, 'to', new.stage_id));
  end if;
  if new.owner_id is distinct from old.owner_id then
    insert into public.activities (lead_id, actor_id, type, title, metadata)
    values (new.id, auth.uid(), 'assignment', 'Responsável alterado',
            jsonb_build_object('from', old.owner_id, 'to', new.owner_id));
  end if;
  return new;
end $$;
create trigger leads_stage_change before update on public.leads
  for each row execute function public.on_lead_stage_change();

-- ───────── 5. Webhook inbox (idempotência + auditoria) ─────────
create table public.webhook_events (
  id               uuid primary key default gen_random_uuid(),
  source           text not null,
  idempotency_key  text not null unique,
  payload          jsonb not null,
  status           public.webhook_status not null default 'received',
  error            text,
  lead_id          uuid references public.leads(id) on delete set null,
  created_at       timestamptz not null default now(),
  processed_at     timestamptz
);
create index webhook_events_status_idx on public.webhook_events (status, created_at desc);

-- ───────── RLS ─────────
alter table public.profiles        enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.leads           enable row level security;
alter table public.activities      enable row level security;
alter table public.webhook_events  enable row level security;

revoke all on all tables in schema public from anon;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using ((select public.app_role()) is not null);
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_update_admin on public.profiles for update to authenticated
  using ((select public.app_role()) = 'admin');

-- pipeline_stages: todos leem, admin/manager editam
create policy stages_select on public.pipeline_stages for select to authenticated
  using ((select public.app_role()) is not null);
create policy stages_write on public.pipeline_stages for all to authenticated
  using ((select public.app_role()) in ('admin','manager'))
  with check ((select public.app_role()) in ('admin','manager'));

-- leads: admin/manager veem tudo; sales veem os próprios + fila sem dono
create policy leads_select on public.leads for select to authenticated using (
  (select public.app_role()) in ('admin','manager')
  or ((select public.app_role()) = 'sales' and (owner_id = (select auth.uid()) or owner_id is null))
);
create policy leads_insert on public.leads for insert to authenticated with check (
  created_by = (select auth.uid())
  and ((select public.app_role()) in ('admin','manager')
       or ((select public.app_role()) = 'sales' and (owner_id is null or owner_id = (select auth.uid()))))
);
create policy leads_update on public.leads for update to authenticated
  using (
    (select public.app_role()) in ('admin','manager')
    or ((select public.app_role()) = 'sales' and (owner_id = (select auth.uid()) or owner_id is null))
  )
  with check (
    (select public.app_role()) in ('admin','manager')
    or ((select public.app_role()) = 'sales' and owner_id = (select auth.uid()))   -- sales "assume" o lead, não repassa
  );
create policy leads_delete on public.leads for delete to authenticated
  using ((select public.app_role()) = 'admin');

-- activities: visíveis se o lead for visível (a RLS de leads vale no subselect); imutáveis
create policy activities_select on public.activities for select to authenticated
  using (exists (select 1 from public.leads l where l.id = lead_id));
create policy activities_insert on public.activities for insert to authenticated
  with check (actor_id = (select auth.uid())
              and exists (select 1 from public.leads l where l.id = lead_id));
-- sem policies de update/delete: logs não são editáveis pelo app

-- webhook_events: só admin lê; escrita apenas via service_role
create policy webhook_events_select on public.webhook_events for select to authenticated
  using ((select public.app_role()) = 'admin');

-- ───────── Realtime (Kanban ao vivo) ─────────
alter publication supabase_realtime add table public.leads, public.activities;
