-- Link Supabase Auth users created before the profile trigger was installed.
-- If the workspace has no profiles yet, its oldest existing Auth user becomes admin.
with unlinked_users as (
  select
    u.id,
    u.raw_user_meta_data,
    u.email,
    row_number() over (order by u.created_at, u.id) as user_order
  from auth.users u
  where not exists (
    select 1
    from public.profiles p
    where p.id = u.id
  )
)
insert into public.profiles (id, full_name, avatar_url, role)
select
  id,
  coalesce(raw_user_meta_data->>'full_name', split_part(coalesce(email, ''), '@', 1)),
  raw_user_meta_data->>'avatar_url',
  case
    when user_order = 1 and not exists (select 1 from public.profiles)
      then 'admin'::public.user_role
    else 'sales'::public.user_role
  end
from unlinked_users
order by user_order;
