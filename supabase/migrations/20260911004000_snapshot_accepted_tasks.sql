alter table public.tasks
  add column business_name text,
  add column business_category text,
  add column business_city text,
  add column business_district text,
  add column review_url_snapshot text;

update public.tasks t
set
  business_name = b.name,
  business_category = b.category,
  business_city = b.city,
  business_district = b.district,
  review_url_snapshot = b.review_url
from public.businesses b
where b.id = t.business_id;

alter table public.tasks
  alter column business_name set not null,
  alter column business_category set not null,
  alter column business_city set not null,
  alter column business_district set not null,
  alter column review_url_snapshot set not null;

create or replace function public.accept_review_task(p_giver_id uuid, p_business_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_owner_credits integer;
  v_owner_limit integer;
  v_giver_limit integer;
  v_task_id uuid;
  v_business_name text;
  v_business_category text;
  v_business_city text;
  v_business_district text;
  v_review_url text;
begin
  select b.owner_id, b.name, b.category, b.city, b.district, b.review_url
  into v_owner_id, v_business_name, v_business_category, v_business_city, v_business_district, v_review_url
  from public.businesses b
  where b.id = p_business_id and b.active = true
  for update;
  if v_owner_id is null then raise exception 'This business is not available.'; end if;
  if v_owner_id = p_giver_id then raise exception 'You cannot review your own business.'; end if;

  perform 1
  from public.users u
  where u.id in (p_giver_id, v_owner_id)
  order by u.id
  for update;

  select u.daily_give_limit into v_giver_limit
  from public.users u where u.id = p_giver_id;
  if v_giver_limit is null then raise exception 'User not found.'; end if;

  select u.credit_balance, u.daily_receive_limit into v_owner_credits, v_owner_limit
  from public.users u where u.id = v_owner_id;
  if v_owner_credits < 1 then raise exception 'This business has no receive credit.'; end if;

  if exists (
    select 1 from public.tasks t
    where t.giver_id = p_giver_id and t.business_id = p_business_id
      and t.status in ('accepted', 'submitted', 'completed')
  ) then raise exception 'You already accepted or completed this business.'; end if;

  if exists (
    select 1 from public.skips s
    where s.giver_id = p_giver_id and s.business_id = p_business_id
      and s.skipped_at > now() - interval '30 days'
  ) then raise exception 'This business was skipped recently.'; end if;

  if (
    select count(*) from public.tasks t
    where t.giver_id = p_giver_id
      and (t.accepted_at at time zone 'Asia/Taipei')::date = (now() at time zone 'Asia/Taipei')::date
  ) >= v_giver_limit then raise exception 'Daily give limit reached.'; end if;

  if (
    select count(*) from public.tasks t
    join public.businesses b on b.id = t.business_id
    where b.owner_id = v_owner_id
      and (t.accepted_at at time zone 'Asia/Taipei')::date = (now() at time zone 'Asia/Taipei')::date
  ) >= v_owner_limit then raise exception 'This business reached its daily receive limit.'; end if;

  insert into public.tasks (
    giver_id,
    business_id,
    business_name,
    business_category,
    business_city,
    business_district,
    review_url_snapshot
  ) values (
    p_giver_id,
    p_business_id,
    v_business_name,
    v_business_category,
    v_business_city,
    v_business_district,
    v_review_url
  ) returning id into v_task_id;

  update public.users set credit_balance = credit_balance - 1, updated_at = now() where id = v_owner_id;
  insert into public.credit_ledger (user_id, delta, reason, task_id)
  values (v_owner_id, -1, 'task_reserved', v_task_id);
  return v_task_id;
end;
$$;

revoke all on function public.accept_review_task(uuid, uuid) from public, anon, authenticated;
grant execute on function public.accept_review_task(uuid, uuid) to service_role;
