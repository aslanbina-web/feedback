-- GiveGet onboarding state and enforceable per-plan Give/Receive limits.
-- Existing members skip the new tutorial; only accounts created after this
-- migration enter the onboarding flow.

alter table public.users
  add column onboarding_tutorial_seen_at timestamptz,
  add column onboarding_completed_at timestamptz,
  add column plan_started_at timestamptz not null default now(),
  add column plan_give_limit integer not null default 30 check (plan_give_limit > 0),
  add column plan_receive_limit integer not null default 30 check (plan_receive_limit > 0);

with entitlement_counts as (
  select
    u.id,
    1 + count(r.id) filter (where r.rewarded_at is not null) as periods
  from public.users u
  left join public.referrals r on r.inviter_id = u.id
  group by u.id
)
update public.users u
set
  onboarding_tutorial_seen_at = now(),
  onboarding_completed_at = now(),
  plan_give_limit = 30 * e.periods,
  plan_receive_limit = 30 * e.periods,
  plan_started_at = u.plan_expires_at - ((30 * e.periods) * interval '1 day')
from entitlement_counts e
where e.id = u.id;

create or replace function public.get_plan_stats(p_user_id uuid)
returns table (
  gives bigint,
  receives bigint,
  give_limit integer,
  receive_limit integer,
  period_started_at timestamptz,
  period_ends_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*)
      from public.tasks t
      where t.giver_id = u.id
        and t.status = 'completed'
        and t.completed_at >= u.plan_started_at),
    (select count(*)
      from public.tasks t
      join public.businesses b on b.id = t.business_id
      where b.owner_id = u.id
        and t.status = 'completed'
        and t.completed_at >= u.plan_started_at),
    u.plan_give_limit,
    u.plan_receive_limit,
    u.plan_started_at,
    u.plan_expires_at
  from public.users u
  where u.id = p_user_id;
$$;

-- Reserve quota when a task is accepted. Expired/rejected tasks stop consuming
-- plan quota, while accepted/submitted/completed tasks remain protected.
create or replace function public.enforce_task_plan_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_giver public.users%rowtype;
  v_owner public.users%rowtype;
begin
  select b.owner_id into v_owner_id
  from public.businesses b
  where b.id = new.business_id;

  select * into v_giver from public.users u where u.id = new.giver_id;
  select * into v_owner from public.users u where u.id = v_owner_id;

  if (
    select count(*)
    from public.tasks t
    where t.giver_id = new.giver_id
      and t.status in ('accepted', 'submitted', 'completed')
      and t.accepted_at >= v_giver.plan_started_at
  ) >= v_giver.plan_give_limit then
    raise exception 'Your Free Plan Give limit has been reached.';
  end if;

  if (
    select count(*)
    from public.tasks t
    where t.business_id = new.business_id
      and t.status in ('accepted', 'submitted', 'completed')
      and t.accepted_at >= v_owner.plan_started_at
  ) >= v_owner.plan_receive_limit then
    raise exception 'This business has reached its Free Plan Receive limit.';
  end if;

  return new;
end;
$$;

create trigger enforce_task_plan_limits_before_insert
before insert on public.tasks
for each row execute function public.enforce_task_plan_limits();

create or replace function public.get_discover_feed(p_giver_id uuid, p_limit integer default 3)
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
      ),
      u.plan_give_limit - (
        select count(*)::integer from public.tasks t
        where t.giver_id = p_giver_id
          and t.status in ('accepted', 'submitted', 'completed')
          and t.accepted_at >= u.plan_started_at
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
      and (
        select count(*) from public.tasks plan_receive
        where plan_receive.business_id = b.id
          and plan_receive.status in ('accepted', 'submitted', 'completed')
          and plan_receive.accepted_at >= owner.plan_started_at
      ) < owner.plan_receive_limit
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
        and b.sample_review_added_at is not null
    )
  for update;

  if v_referral.id is null then return new; end if;

  update public.referrals
  set qualified_at = coalesce(qualified_at, now()), rewarded_at = now()
  where id = v_referral.id and rewarded_at is null;

  if found then
    update public.users
    set
      plan_expires_at = greatest(plan_expires_at, now()) + interval '30 days',
      plan_give_limit = plan_give_limit + 30,
      plan_receive_limit = plan_receive_limit + 30,
      updated_at = now()
    where id = v_referral.inviter_id;
  end if;
  return new;
end;
$$;

revoke all on function public.get_plan_stats(uuid) from public, anon, authenticated;
revoke all on function public.enforce_task_plan_limits() from public, anon, authenticated;
revoke all on function public.get_discover_feed(uuid, integer) from public, anon, authenticated;
revoke all on function public.reward_qualified_referral() from public, anon, authenticated;
grant execute on function public.get_plan_stats(uuid) to service_role;
grant execute on function public.get_discover_feed(uuid, integer) to service_role;
