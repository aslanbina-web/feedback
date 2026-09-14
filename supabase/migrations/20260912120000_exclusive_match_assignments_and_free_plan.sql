-- Final GiveGet lifecycle: 30-day free plan, exclusive 30-minute matches,
-- strict reciprocal exclusion, and idempotent referral rewards.

alter table public.users
  add column plan_expires_at timestamptz not null default (now() + interval '30 days'),
  add column referral_code text,
  add column referred_by uuid references public.users(id) on delete set null;

update public.users
set referral_code = lower(substr(md5(id::text), 1, 12))
where referral_code is null;

alter table public.users alter column referral_code set not null;
alter table public.users alter column referral_code
  set default lower(substr(md5(gen_random_uuid()::text), 1, 12));
create unique index users_referral_code_idx on public.users (referral_code);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.users(id) on delete cascade,
  invitee_id uuid not null unique references public.users(id) on delete cascade,
  qualified_at timestamptz,
  rewarded_at timestamptz,
  created_at timestamptz not null default now(),
  check (inviter_id <> invitee_id)
);

create index referrals_inviter_idx on public.referrals (inviter_id, created_at desc);
alter table public.referrals enable row level security;
revoke all on public.referrals from public, anon, authenticated;
grant all on public.referrals to service_role;

create table public.match_assignments (
  id uuid primary key default gen_random_uuid(),
  giver_id uuid not null references public.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'accepted', 'expired')),
  assigned_at timestamptz not null default now(),
  assigned_until timestamptz not null default (now() + interval '30 minutes'),
  task_id uuid unique references public.tasks(id) on delete set null
);

create unique index match_assignments_one_active_business_idx
on public.match_assignments (business_id) where status = 'active';
create unique index match_assignments_one_active_pair_idx
on public.match_assignments (giver_id, business_id) where status = 'active';
create index match_assignments_giver_active_idx
on public.match_assignments (giver_id, status, assigned_until);
create index match_assignments_expiry_idx
on public.match_assignments (assigned_until) where status = 'active';
create index match_assignments_history_idx
on public.match_assignments (giver_id, business_id, assigned_at desc);

alter table public.match_assignments enable row level security;
revoke all on public.match_assignments from public, anon, authenticated;
grant all on public.match_assignments to service_role;

create or replace function public.claim_referral(p_invitee_id uuid, p_referral_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inviter_id uuid;
begin
  select u.id into v_inviter_id
  from public.users u
  where u.referral_code = lower(btrim(p_referral_code));

  if v_inviter_id is null or v_inviter_id = p_invitee_id then return false; end if;

  update public.users
  set referred_by = v_inviter_id, updated_at = now()
  where id = p_invitee_id and referred_by is null;

  if not found then return false; end if;

  insert into public.referrals (inviter_id, invitee_id)
  values (v_inviter_id, p_invitee_id)
  on conflict (invitee_id) do nothing;
  return true;
end;
$$;

create or replace function public.reward_qualified_referral()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_referral public.referrals%rowtype;
begin
  if new.status <> 'completed' or old.status = 'completed' then return new; end if;

  select * into v_referral
  from public.referrals r
  where r.invitee_id = new.giver_id
    and r.rewarded_at is null
    and exists (
      select 1
      from public.businesses b
      where b.owner_id = r.invitee_id
        and b.active = true
        and exists (
          select 1 from public.business_review_samples s where s.business_id = b.id
        )
    )
  for update;

  if v_referral.id is null then return new; end if;

  update public.referrals
  set qualified_at = coalesce(qualified_at, now()), rewarded_at = now()
  where id = v_referral.id and rewarded_at is null;

  if found then
    update public.users
    set plan_expires_at = greatest(plan_expires_at, now()) + interval '30 days', updated_at = now()
    where id = v_referral.inviter_id;
  end if;
  return new;
end;
$$;

create trigger reward_referral_after_task_completion
after update of status on public.tasks
for each row execute function public.reward_qualified_referral();

create or replace function public.get_monthly_stats(p_user_id uuid)
returns table (gives bigint, receives bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.tasks t
      where t.giver_id = p_user_id and t.status = 'completed'
        and date_trunc('month', t.completed_at at time zone 'Asia/Taipei') = date_trunc('month', now() at time zone 'Asia/Taipei')),
    (select count(*) from public.tasks t join public.businesses b on b.id = t.business_id
      where b.owner_id = p_user_id and t.status = 'completed'
        and date_trunc('month', t.completed_at at time zone 'Asia/Taipei') = date_trunc('month', now() at time zone 'Asia/Taipei'));
$$;

create or replace function public.expire_match_assignments()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.match_assignments
  set status = 'expired'
  where status = 'active' and assigned_until <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

drop function if exists public.get_discover_feed(uuid, integer);

create function public.get_discover_feed(p_giver_id uuid, p_limit integer default 3)
returns table (
  assignment_id uuid,
  id uuid,
  category text,
  city text,
  district text,
  generic_description text,
  assigned_until timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_slots integer;
  v_existing integer;
  v_candidate record;
begin
  perform public.expire_match_assignments();

  perform 1 from public.users u where u.id = p_giver_id for update;

  if not exists (
    select 1 from public.users u
    where u.id = p_giver_id and u.plan_expires_at > now()
  ) then return; end if;

  select least(
    least(greatest(p_limit, 1), 3),
    greatest(least(
      u.give_allowance_balance
        + greatest((now() at time zone 'Asia/Taipei')::date - u.allowance_accrued_on, 0),
      u.daily_give_limit - (
        select count(*)::integer from public.tasks t
        where t.giver_id = p_giver_id
          and (t.accepted_at at time zone 'Asia/Taipei')::date = (now() at time zone 'Asia/Taipei')::date
      )
    ), 0)
  ) into v_slots
  from public.users u where u.id = p_giver_id;

  select count(*)::integer into v_existing
  from public.match_assignments a
  where a.giver_id = p_giver_id and a.status = 'active' and a.assigned_until > now();

  for v_candidate in
    select b.id
    from public.businesses b
    join public.users owner on owner.id = b.owner_id
    where v_existing < v_slots
      and b.active = true
      and b.owner_id <> p_giver_id
      and owner.plan_expires_at > now()
      and owner.credit_balance > 0
      and owner.receive_allowance_balance
            + greatest((now() at time zone 'Asia/Taipei')::date - owner.allowance_accrued_on, 0) > 0
      and exists (select 1 from public.business_review_samples s where s.business_id = b.id)
      and not exists (
        select 1 from public.tasks prior
        where prior.giver_id = p_giver_id and prior.business_id = b.id
          and prior.status in ('accepted', 'submitted', 'completed')
      )
      and not exists (
        select 1
        from public.tasks reverse_task
        join public.businesses giver_business on giver_business.id = reverse_task.business_id
        where reverse_task.giver_id = b.owner_id
          and giver_business.owner_id = p_giver_id
          and reverse_task.status in ('accepted', 'submitted', 'completed')
      )
      and not exists (
        select 1 from public.match_assignments recent
        where recent.giver_id = p_giver_id and recent.business_id = b.id
          and recent.assigned_at > now() - interval '7 days'
      )
      and not exists (
        select 1 from public.match_assignments active
        where active.business_id = b.id and active.status = 'active'
          and active.assigned_until > now()
      )
      and (
        select count(*) from public.tasks today_receive
        where today_receive.business_id = b.id
          and today_receive.status in ('accepted', 'submitted', 'completed')
          and (today_receive.accepted_at at time zone 'Asia/Taipei')::date = (now() at time zone 'Asia/Taipei')::date
      ) < owner.daily_receive_limit
    order by
      (select count(*) from public.tasks done where done.business_id = b.id and done.status = 'completed') asc,
      (select max(done.accepted_at) from public.tasks done where done.business_id = b.id and done.status = 'completed') asc nulls first,
      random()
    for update of b skip locked
  loop
    begin
      insert into public.match_assignments (giver_id, business_id)
      values (p_giver_id, v_candidate.id);
      v_existing := v_existing + 1;
      exit when v_existing >= v_slots;
    exception when unique_violation then
      null;
    end;
  end loop;

  return query
  select a.id, b.id, b.category, b.city, b.district, b.generic_description, a.assigned_until
  from public.match_assignments a
  join public.businesses b on b.id = a.business_id
  where a.giver_id = p_giver_id and a.status = 'active' and a.assigned_until > now()
  order by a.assigned_at
  limit least(greatest(p_limit, 1), 3);
end;
$$;

drop function if exists public.accept_review_task(uuid, uuid);

create function public.accept_review_task(p_giver_id uuid, p_assignment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Asia/Taipei')::date;
  v_assignment public.match_assignments%rowtype;
  v_owner_id uuid;
  v_owner_credits integer;
  v_owner_allowance integer;
  v_owner_limit integer;
  v_giver_allowance integer;
  v_giver_limit integer;
  v_task_id uuid;
  v_business public.businesses%rowtype;
begin
  perform public.expire_match_assignments();

  select * into v_assignment from public.match_assignments a
  where a.id = p_assignment_id and a.giver_id = p_giver_id and a.status = 'active'
  for update;
  if v_assignment.id is null or v_assignment.assigned_until <= now() then
    raise exception 'This assignment expired. A replacement is ready in Discover.';
  end if;

  if not exists (select 1 from public.users u where u.id = p_giver_id and u.plan_expires_at > now()) then
    raise exception 'Your free plan has ended.';
  end if;

  select * into v_business from public.businesses b
  where b.id = v_assignment.business_id and b.active = true for update;
  v_owner_id := v_business.owner_id;
  if v_owner_id is null then raise exception 'This business is not available.'; end if;

  perform 1 from public.users u
  where u.id in (p_giver_id, v_owner_id) order by u.id for update;

  update public.users u
  set give_allowance_balance = u.give_allowance_balance + greatest(v_today - u.allowance_accrued_on, 0),
      receive_allowance_balance = u.receive_allowance_balance + greatest(v_today - u.allowance_accrued_on, 0),
      allowance_accrued_on = greatest(u.allowance_accrued_on, v_today),
      updated_at = case when u.allowance_accrued_on < v_today then now() else u.updated_at end
  where u.id in (p_giver_id, v_owner_id);

  select u.give_allowance_balance, u.daily_give_limit
  into v_giver_allowance, v_giver_limit from public.users u where u.id = p_giver_id;
  select u.credit_balance, u.receive_allowance_balance, u.daily_receive_limit
  into v_owner_credits, v_owner_allowance, v_owner_limit from public.users u where u.id = v_owner_id;

  if v_giver_allowance < 1 then raise exception 'No Give pass is available yet.'; end if;
  if v_owner_credits < 1 then raise exception 'This business has no receive credit.'; end if;
  if v_owner_allowance < 1 then raise exception 'This business has no Receive pass available.'; end if;
  if (select count(*) from public.tasks t where t.giver_id = p_giver_id
      and (t.accepted_at at time zone 'Asia/Taipei')::date = v_today) >= v_giver_limit then
    raise exception 'Daily Give maximum reached.';
  end if;
  if (select count(*) from public.tasks t where t.business_id = v_business.id
      and t.status in ('accepted', 'submitted', 'completed')
      and (t.accepted_at at time zone 'Asia/Taipei')::date = v_today) >= v_owner_limit then
    raise exception 'This business reached its daily Receive maximum.';
  end if;

  insert into public.tasks (
    giver_id, business_id, business_name, business_category, business_city,
    business_district, review_url_snapshot, expires_at, receive_allowance_reserved
  ) values (
    p_giver_id, v_business.id, v_business.name, v_business.category, v_business.city,
    v_business.district, v_business.review_url, now() + interval '60 minutes', true
  ) returning id into v_task_id;

  update public.users set give_allowance_balance = give_allowance_balance - 1, updated_at = now()
  where id = p_giver_id;
  update public.users set credit_balance = credit_balance - 1,
    receive_allowance_balance = receive_allowance_balance - 1, updated_at = now()
  where id = v_owner_id;
  insert into public.credit_ledger (user_id, delta, reason, task_id)
  values (v_owner_id, -1, 'task_reserved', v_task_id);

  update public.match_assignments set status = 'accepted', task_id = v_task_id
  where id = v_assignment.id;
  return v_task_id;
end;
$$;

revoke all on function public.claim_referral(uuid, text) from public, anon, authenticated;
revoke all on function public.reward_qualified_referral() from public, anon, authenticated;
revoke all on function public.expire_match_assignments() from public, anon, authenticated;
revoke all on function public.get_discover_feed(uuid, integer) from public, anon, authenticated;
revoke all on function public.accept_review_task(uuid, uuid) from public, anon, authenticated;
revoke all on function public.get_monthly_stats(uuid) from public, anon, authenticated;
drop function if exists public.skip_business(uuid, uuid);
grant execute on function public.claim_referral(uuid, text) to service_role;
grant execute on function public.expire_match_assignments() to service_role;
grant execute on function public.get_discover_feed(uuid, integer) to service_role;
grant execute on function public.accept_review_task(uuid, uuid) to service_role;
grant execute on function public.get_monthly_stats(uuid) to service_role;
