create extension if not exists pgcrypto;

create type public.user_role as enum ('member', 'admin');
create type public.task_status as enum ('accepted', 'submitted', 'completed', 'rejected', 'expired');

create table public.users (
  id uuid primary key default gen_random_uuid(),
  line_user_id text not null unique,
  display_name text not null check (char_length(display_name) between 1 and 120),
  avatar_url text,
  role public.user_role not null default 'member',
  credit_balance integer not null default 0 check (credit_balance >= 0),
  daily_give_limit integer not null default 3 check (daily_give_limit between 1 and 100),
  daily_receive_limit integer not null default 3 check (daily_receive_limit between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  category text not null check (char_length(category) between 1 and 80),
  city text not null check (char_length(city) between 1 and 80),
  district text not null check (char_length(district) between 1 and 80),
  generic_description text not null check (char_length(generic_description) between 1 and 280),
  review_url text not null check (review_url ~ '^https?://'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  giver_id uuid not null references public.users(id) on delete restrict,
  business_id uuid not null references public.businesses(id) on delete restrict,
  status public.task_status not null default 'accepted',
  accepted_at timestamptz not null default now(),
  submitted_at timestamptz,
  completed_at timestamptz,
  proof_url text,
  admin_note text,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index tasks_one_eligible_business_per_giver
on public.tasks (giver_id, business_id)
where status in ('accepted', 'submitted', 'completed');
create index tasks_giver_status_idx on public.tasks (giver_id, status, accepted_at desc);
create index tasks_business_status_idx on public.tasks (business_id, status, accepted_at desc);

create table public.skips (
  giver_id uuid not null references public.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  skipped_at timestamptz not null default now(),
  primary key (giver_id, business_id)
);

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete restrict,
  delta integer not null check (delta <> 0),
  reason text not null check (reason in ('task_reserved', 'give_approved', 'task_refund', 'admin_adjustment')),
  task_id uuid references public.tasks(id) on delete restrict,
  note text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, task_id, reason)
);
create index credit_ledger_user_idx on public.credit_ledger (user_id, created_at desc);

alter table public.users enable row level security;
alter table public.businesses enable row level security;
alter table public.tasks enable row level security;
alter table public.skips enable row level security;
alter table public.credit_ledger enable row level security;

revoke all on public.users, public.businesses, public.tasks, public.skips, public.credit_ledger from anon, authenticated;
grant all on public.users, public.businesses, public.tasks, public.skips, public.credit_ledger to service_role;

create or replace function public.get_daily_stats(p_user_id uuid)
returns table (gives bigint, receives bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      select count(*) from public.tasks t
      where t.giver_id = p_user_id
        and (t.accepted_at at time zone 'Asia/Taipei')::date = (now() at time zone 'Asia/Taipei')::date
    ) as gives,
    (
      select count(*) from public.tasks t
      join public.businesses b on b.id = t.business_id
      where b.owner_id = p_user_id
        and (t.accepted_at at time zone 'Asia/Taipei')::date = (now() at time zone 'Asia/Taipei')::date
    ) as receives;
$$;

create or replace function public.get_discover_feed(p_giver_id uuid, p_limit integer default 20)
returns table (
  id uuid,
  category text,
  city text,
  district text,
  generic_description text
)
language sql
volatile
security definer
set search_path = ''
as $$
  with giver as (
    select u.daily_give_limit
    from public.users u
    where u.id = p_giver_id
  ), eligible as (
    select
      b.id,
      b.category,
      b.city,
      b.district,
      b.generic_description,
      exists (
        select 1
        from public.tasks reverse_task
        join public.businesses giver_business on giver_business.id = reverse_task.business_id
        where reverse_task.giver_id = b.owner_id
          and giver_business.owner_id = p_giver_id
          and reverse_task.status in ('accepted', 'submitted', 'completed')
      ) as is_reciprocal
    from public.businesses b
    join public.users owner on owner.id = b.owner_id
    cross join giver g
    where b.active = true
      and b.owner_id <> p_giver_id
      and owner.credit_balance > 0
      and not exists (
        select 1 from public.tasks prior
        where prior.giver_id = p_giver_id
          and prior.business_id = b.id
          and prior.status in ('accepted', 'submitted', 'completed')
      )
      and not exists (
        select 1 from public.skips s
        where s.giver_id = p_giver_id
          and s.business_id = b.id
          and s.skipped_at > now() - interval '30 days'
      )
      and (
        select count(*) from public.tasks today_give
        where today_give.giver_id = p_giver_id
          and (today_give.accepted_at at time zone 'Asia/Taipei')::date = (now() at time zone 'Asia/Taipei')::date
      ) < g.daily_give_limit
      and (
        select count(*) from public.tasks today_receive
        join public.businesses rb on rb.id = today_receive.business_id
        where rb.owner_id = b.owner_id
          and (today_receive.accepted_at at time zone 'Asia/Taipei')::date = (now() at time zone 'Asia/Taipei')::date
      ) < owner.daily_receive_limit
  )
  select e.id, e.category, e.city, e.district, e.generic_description
  from eligible e
  order by e.is_reciprocal asc, random()
  limit least(greatest(p_limit, 1), 50);
$$;

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
begin
  select b.owner_id into v_owner_id
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

  insert into public.tasks (giver_id, business_id)
  values (p_giver_id, p_business_id)
  returning id into v_task_id;

  update public.users set credit_balance = credit_balance - 1, updated_at = now() where id = v_owner_id;
  insert into public.credit_ledger (user_id, delta, reason, task_id)
  values (v_owner_id, -1, 'task_reserved', v_task_id);
  return v_task_id;
end;
$$;

create or replace function public.skip_business(p_giver_id uuid, p_business_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.users where id = p_giver_id) then raise exception 'User not found.'; end if;
  if not exists (select 1 from public.businesses where id = p_business_id) then raise exception 'Business not found.'; end if;
  insert into public.skips (giver_id, business_id, skipped_at)
  values (p_giver_id, p_business_id, now())
  on conflict (giver_id, business_id) do update set skipped_at = excluded.skipped_at;
end;
$$;

create or replace function public.submit_review_task(p_giver_id uuid, p_task_id uuid, p_proof_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_proof_url !~ '^https?://' then raise exception 'A valid proof link is required.'; end if;
  update public.tasks
  set status = 'submitted', proof_url = p_proof_url, submitted_at = now()
  where id = p_task_id and giver_id = p_giver_id and status = 'accepted';
  if not found then raise exception 'Task is not available for submission.'; end if;
end;
$$;

create or replace function public.review_submission(p_admin_id uuid, p_task_id uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_giver_id uuid;
  v_owner_id uuid;
begin
  if not exists (select 1 from public.users where id = p_admin_id and role = 'admin') then
    raise exception 'Admin access required.';
  end if;

  select t.giver_id, b.owner_id into v_giver_id, v_owner_id
  from public.tasks t
  join public.businesses b on b.id = t.business_id
  where t.id = p_task_id and t.status = 'submitted'
  for update of t;
  if v_giver_id is null then raise exception 'Submission is no longer pending.'; end if;

  if p_approve then
    update public.tasks set status = 'completed', completed_at = now(), reviewed_by = p_admin_id, reviewed_at = now(), admin_note = p_note where id = p_task_id;
    update public.users set credit_balance = credit_balance + 1, updated_at = now() where id = v_giver_id;
    insert into public.credit_ledger (user_id, delta, reason, task_id, created_by, note)
    values (v_giver_id, 1, 'give_approved', p_task_id, p_admin_id, p_note);
  else
    update public.tasks set status = 'rejected', reviewed_by = p_admin_id, reviewed_at = now(), admin_note = p_note where id = p_task_id;
    update public.users set credit_balance = credit_balance + 1, updated_at = now() where id = v_owner_id;
    insert into public.credit_ledger (user_id, delta, reason, task_id, created_by, note)
    values (v_owner_id, 1, 'task_refund', p_task_id, p_admin_id, p_note);
  end if;
end;
$$;

create or replace function public.admin_adjust_credit(p_admin_id uuid, p_user_id uuid, p_delta integer, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.users where id = p_admin_id and role = 'admin') then raise exception 'Admin access required.'; end if;
  if p_delta = 0 or abs(p_delta) > 100 then raise exception 'Credit adjustment must be between -100 and 100.'; end if;
  update public.users set credit_balance = credit_balance + p_delta, updated_at = now()
  where id = p_user_id and credit_balance + p_delta >= 0;
  if not found then raise exception 'User not found or adjustment would make balance negative.'; end if;
  insert into public.credit_ledger (user_id, delta, reason, note, created_by)
  values (p_user_id, p_delta, 'admin_adjustment', p_note, p_admin_id);
end;
$$;

revoke all on function public.get_discover_feed(uuid, integer) from public, anon, authenticated;
revoke all on function public.get_daily_stats(uuid) from public, anon, authenticated;
revoke all on function public.accept_review_task(uuid, uuid) from public, anon, authenticated;
revoke all on function public.skip_business(uuid, uuid) from public, anon, authenticated;
revoke all on function public.submit_review_task(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.review_submission(uuid, uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.admin_adjust_credit(uuid, uuid, integer, text) from public, anon, authenticated;

grant execute on function public.get_discover_feed(uuid, integer) to service_role;
grant execute on function public.get_daily_stats(uuid) to service_role;
grant execute on function public.accept_review_task(uuid, uuid) to service_role;
grant execute on function public.skip_business(uuid, uuid) to service_role;
grant execute on function public.submit_review_task(uuid, uuid, text) to service_role;
grant execute on function public.review_submission(uuid, uuid, boolean, text) to service_role;
grant execute on function public.admin_adjust_credit(uuid, uuid, integer, text) to service_role;
