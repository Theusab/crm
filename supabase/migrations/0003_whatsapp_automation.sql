-- Admin-managed WhatsApp automation settings. API credentials remain server-only.
create table public.crm_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger crm_settings_updated before update on public.crm_settings
  for each row execute function public.set_updated_at();

alter table public.crm_settings enable row level security;
revoke all on public.crm_settings from anon;
grant select, insert, update on public.crm_settings to authenticated;

create policy crm_settings_select_admin on public.crm_settings for select to authenticated
  using ((select public.app_role()) = 'admin');
create policy crm_settings_insert_admin on public.crm_settings for insert to authenticated
  with check ((select public.app_role()) = 'admin');
create policy crm_settings_update_admin on public.crm_settings for update to authenticated
  using ((select public.app_role()) = 'admin')
  with check ((select public.app_role()) = 'admin');
