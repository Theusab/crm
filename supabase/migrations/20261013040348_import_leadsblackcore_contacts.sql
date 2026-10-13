-- Import the existing contact directory as native CRM leads.
-- Re-running this statement is safe: source + external_id is unique per contact.
do $$
begin
  if to_regclass('public."leadsBlackcore"') is null then
    raise exception 'The source table public."leadsBlackcore" does not exist';
  end if;

  if not exists (select 1 from public.pipeline_stages where slug = 'novo') then
    raise exception 'The initial pipeline stage "novo" does not exist';
  end if;
end;
$$;

update public.leads
set custom = custom || '{"record_type":"contact"}'::jsonb
where custom->>'record_type' is null
  and source <> 'leadsBlackcore';

with source_rows as (
  select
    nullif(btrim("Empresa"), '') as company_name,
    nullif(btrim("Cidade"), '') as city,
    nullif(btrim("Especialidade"), '') as specialty,
    regexp_replace(coalesce("Telefone"::text, ''), '[^0-9]', '', 'g') as phone_digits,
    nullif(btrim("Site"), '') as website,
    nullif(btrim("Tem site"), '') as has_website,
    nullif(btrim("Status"), '') as source_status,
    case
      when btrim(coalesce("Email", '')) ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
        then lower(btrim("Email"))
      else null
    end as normalized_email
  from public."leadsBlackcore"
),
email_ranked as (
  select
    source_rows.*,
    case
      when normalized_email is not null then
        row_number() over (partition by normalized_email order by company_name)
      else null
    end as email_rank
  from source_rows
),
mapped_contacts as (
  select
    company_name,
    case when email_rank = 1 then normalized_email else null end as email,
    case
      when length(phone_digits) = 10 then '+1' || phone_digits
      when length(phone_digits) between 11 and 15 then '+' || phone_digits
      else null
    end as phone,
    city,
    specialty,
    website,
    has_website,
    source_status,
    normalized_email as original_email,
    email_rank > 1 as shared_email,
    row_number() over (order by company_name) as source_position
  from email_ranked
  where company_name is not null
)
 , inserted_leads as (
  insert into public.leads (
    name,
    email,
    phone,
    company,
    job_title,
    source,
    external_id,
    stage_id,
    position,
    status,
    custom
  )
  select
    company_name,
    email,
    phone,
    company_name,
    specialty,
    'leadsBlackcore',
    company_name,
    (select id from public.pipeline_stages where slug = 'novo'),
    extract(epoch from now()) * 1000 + source_position,
    'open',
    jsonb_strip_nulls(jsonb_build_object(
      'record_type', 'lead',
      'city', city,
      'specialty', specialty,
      'website', website,
      'has_website', has_website,
      'source_status', source_status,
      'source_email', case when shared_email then original_email else null end
    ))
  from mapped_contacts
  where phone is not null or email is not null
  on conflict do nothing
  returning id
)
insert into public.activities (lead_id, type, title, body, metadata)
select
  id,
  'system',
  'Lead importado para o CRM',
  'Importação inicial da tabela leadsBlackcore.',
  jsonb_build_object('source_table', 'leadsBlackcore')
from inserted_leads;