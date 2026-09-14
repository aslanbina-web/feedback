alter table public.users
  add column give_allowance_balance integer not null default 1 check (give_allowance_balance >= 0),
  add column receive_allowance_balance integer not null default 1 check (receive_allowance_balance >= 0),
  add column allowance_accrued_on date not null default ((now() at time zone 'Asia/Taipei')::date);

alter table public.tasks
  add column receive_allowance_reserved boolean not null default false;

alter table public.users alter column daily_give_limit set default 3;
alter table public.users alter column daily_receive_limit set default 3;

update public.users
set daily_give_limit = 3,
    daily_receive_limit = 3;

create index if not exists tasks_accepted_expiry_idx
on public.tasks (expires_at)
where status = 'accepted';

create index if not exists skips_giver_skipped_at_idx
on public.skips (giver_id, skipped_at desc);

drop function if exists public.get_daily_stats(uuid);

create function public.get_daily_stats(p_user_id uuid)
returns table (
  gives bigint,
  receives bigint,
  give_allowance integer,
  receive_allowance integer,
  skips bigint,
  skips_remaining integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with account as (
    select
      u.give_allowance_balance
        + greatest((now() at time zone 'Asia/Taipei')::date - u.allowance_accrued_on, 0) as give_allowance,
      u.receive_allowance_balance
        + greatest((now() at time zone 'Asia/Taipei')::date - u.allowance_accrued_on, 0) as receive_allowance
    from public.users u
    where u.id = p_user_id
  ), totals as (
    select
      (
        select count(*)
        from public.tasks t
        where t.giver_id = p_user_id
          and (t.accepted_at at time zone 'Asia/Taipei')::date = (now() at time zone 'Asia/Taipei')::date
      ) as gives,
      (
        select count(*)
        from public.tasks t
        join public.businesses b on b.id = t.business_id
        where b.owner_id = p_user_id
          and t.status in ('accepted', 'submitted', 'completed')
          and (t.accepted_at at time zone 'Asia/Taipei')::date = (now() at time zone 'Asia/Taipei')::date
      ) as receives,
      (
        select count(*)
        from public.skips s
        where s.giver_id = p_user_id
          and (s.skipped_at at time zone 'Asia/Taipei')::date = (now() at time zone 'Asia/Taipei')::date
      ) as skips
  )
  select
    t.gives,
    t.receives,
    a.give_allowance,
    a.receive_allowance,
    t.skips,
    greatest(3 - t.skips::integer, 0)
  from account a
  cross join totals t;
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
    select
      u.daily_give_limit,
      u.give_allowance_balance
        + greatest((now() at time zone 'Asia/Taipei')::date - u.allowance_accrued_on, 0) as give_allowance,
      (
        select count(*)
        from public.tasks today_give
        where today_give.giver_id = p_giver_id
          and (today_give.accepted_at at time zone 'Asia/Taipei')::date = (now() at time zone 'Asia/Taipei')::date
      ) as gives_today
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
      and owner.receive_allowance_balance
            + greatest((now() at time zone 'Asia/Taipei')::date - owner.allowance_accrued_on, 0) > 0
      and g.give_allowance > 0
      and g.gives_today < g.daily_give_limit
      and not exists (
        select 1
        from public.tasks prior
        where prior.giver_id = p_giver_id
          and prior.business_id = b.id
          and prior.status in ('accepted', 'submitted', 'completed')
      )
      and not exists (
        select 1
        from public.skips s
        where s.giver_id = p_giver_id
          and s.business_id = b.id
          and s.skipped_at > now() - interval '7 days'
      )
      and (
        select count(*)
        from public.tasks today_receive
        where today_receive.business_id = b.id
          and today_receive.status in ('accepted', 'submitted', 'completed')
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
  v_today date := (now() at time zone 'Asia/Taipei')::date;
  v_owner_id uuid;
  v_owner_credits integer;
  v_owner_allowance integer;
  v_owner_limit integer;
  v_giver_allowance integer;
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

  if (select count(*) from public.users u where u.id in (p_giver_id, v_owner_id)) <> 2 then
    raise exception 'User not found.';
  end if;

  update public.users u
  set give_allowance_balance = u.give_allowance_balance + greatest(v_today - u.allowance_accrued_on, 0),
      receive_allowance_balance = u.receive_allowance_balance + greatest(v_today - u.allowance_accrued_on, 0),
      allowance_accrued_on = greatest(u.allowance_accrued_on, v_today),
      updated_at = case when u.allowance_accrued_on < v_today then now() else u.updated_at end
  where u.id in (p_giver_id, v_owner_id);

  select u.give_allowance_balance, u.daily_give_limit
  into v_giver_allowance, v_giver_limit
  from public.users u
  where u.id = p_giver_id;

  select u.credit_balance, u.receive_allowance_balance, u.daily_receive_limit
  into v_owner_credits, v_owner_allowance, v_owner_limit
  from public.users u
  where u.id = v_owner_id;

  if v_giver_allowance < 1 then raise exception 'No Give allowance is available yet.'; end if;
  if v_owner_credits < 1 then raise exception 'This business has no receive credit.'; end if;
  if v_owner_allowance < 1 then raise exception 'This business has no Receive allowance available yet.'; end if;

  if exists (
    select 1
    from public.tasks t
    where t.giver_id = p_giver_id
      and t.business_id = p_business_id
      and t.status in ('accepted', 'submitted', 'completed')
  ) then raise exception 'You already accepted or completed this business.'; end if;

  if exists (
    select 1
    from public.skips s
    where s.giver_id = p_giver_id
      and s.business_id = p_business_id
      and s.skipped_at > now() - interval '7 days'
  ) then raise exception 'This business was skipped recently.'; end if;

  if (
    select count(*)
    from public.tasks t
    where t.giver_id = p_giver_id
      and (t.accepted_at at time zone 'Asia/Taipei')::date = v_today
  ) >= v_giver_limit then raise exception 'Daily Give maximum reached.'; end if;

  if (
    select count(*)
    from public.tasks t
    where t.business_id = p_business_id
      and t.status in ('accepted', 'submitted', 'completed')
      and (t.accepted_at at time zone 'Asia/Taipei')::date = v_today
  ) >= v_owner_limit then raise exception 'This business reached its daily Receive maximum.'; end if;

  insert into public.tasks (
    giver_id,
    business_id,
    business_name,
    business_category,
    business_city,
    business_district,
    review_url_snapshot,
    expires_at,
    receive_allowance_reserved
  ) values (
    p_giver_id,
    p_business_id,
    v_business_name,
    v_business_category,
    v_business_city,
    v_business_district,
    v_review_url,
    now() + interval '60 minutes',
    true
  ) returning id into v_task_id;

  update public.users
  set give_allowance_balance = give_allowance_balance - 1,
      updated_at = now()
  where id = p_giver_id;

  update public.users
  set credit_balance = credit_balance - 1,
      receive_allowance_balance = receive_allowance_balance - 1,
      updated_at = now()
  where id = v_owner_id;

  insert into public.credit_ledger (user_id, delta, reason, task_id)
  values (v_owner_id, -1, 'task_reserved', v_task_id);

  return v_task_id;
end;
$$;

create or replace function public.expire_overdue_tasks()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task record;
  v_expired integer := 0;
begin
  for v_task in
    select t.id, t.receive_allowance_reserved, b.owner_id
    from public.tasks t
    join public.businesses b on b.id = t.business_id
    where t.status = 'accepted'
      and t.expires_at <= now()
    order by t.expires_at nulls first, t.accepted_at
    for update of t skip locked
  loop
    perform 1 from public.users where id = v_task.owner_id for update;

    update public.tasks
    set status = 'expired'
    where id = v_task.id and status = 'accepted';

    if found then
      update public.users
      set credit_balance = credit_balance + 1,
          receive_allowance_balance = receive_allowance_balance
            + case when v_task.receive_allowance_reserved then 1 else 0 end,
          updated_at = now()
      where id = v_task.owner_id;

      insert into public.credit_ledger (user_id, delta, reason, task_id, note)
      values (v_task.owner_id, 1, 'task_refund', v_task.id, 'Automatically refunded after 60-minute expiry');

      v_expired := v_expired + 1;
    end if;
  end loop;

  return v_expired;
end;
$$;

create or replace function public.complete_review_task(p_giver_id uuid, p_task_id uuid, p_proof_url text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task record;
begin
  if p_proof_url !~ '^https://' then
    raise exception 'A valid Google Maps proof link is required.';
  end if;

  select t.id, t.giver_id, t.status, t.accepted_at, t.expires_at,
         t.receive_allowance_reserved, b.owner_id
  into v_task
  from public.tasks t
  join public.businesses b on b.id = t.business_id
  where t.id = p_task_id
  for update of t;

  if v_task.id is null or v_task.giver_id <> p_giver_id then
    raise exception 'Task is not available for submission.';
  end if;
  if v_task.status <> 'accepted' then
    raise exception 'Task is no longer available for submission.';
  end if;

  perform 1
  from public.users u
  where u.id in (v_task.giver_id, v_task.owner_id)
  order by u.id
  for update;

  if coalesce(v_task.expires_at, v_task.accepted_at + interval '60 minutes') <= now() then
    update public.tasks set status = 'expired' where id = p_task_id;
    update public.users
    set credit_balance = credit_balance + 1,
        receive_allowance_balance = receive_allowance_balance
          + case when v_task.receive_allowance_reserved then 1 else 0 end,
        updated_at = now()
    where id = v_task.owner_id;
    insert into public.credit_ledger (user_id, delta, reason, task_id, note)
    values (v_task.owner_id, 1, 'task_refund', p_task_id, 'Automatically refunded after 60-minute expiry');
    return 'expired';
  end if;

  update public.tasks
  set status = 'completed',
      proof_url = p_proof_url,
      submitted_at = now(),
      completed_at = now()
  where id = p_task_id;

  update public.users
  set credit_balance = credit_balance + 1,
      updated_at = now()
  where id = v_task.giver_id;

  insert into public.credit_ledger (user_id, delta, reason, task_id, note)
  values (v_task.giver_id, 1, 'give_approved', p_task_id, 'Automatically completed after proof submission');

  return 'completed';
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
  v_receive_allowance_reserved boolean;
begin
  if not exists (select 1 from public.users where id = p_admin_id and role = 'admin') then
    raise exception 'Admin access required.';
  end if;

  select t.giver_id, b.owner_id, t.receive_allowance_reserved
  into v_giver_id, v_owner_id, v_receive_allowance_reserved
  from public.tasks t
  join public.businesses b on b.id = t.business_id
  where t.id = p_task_id and t.status = 'submitted'
  for update of t;

  if v_giver_id is null then raise exception 'Submission is no longer pending.'; end if;

  perform 1
  from public.users u
  where u.id in (v_giver_id, v_owner_id)
  order by u.id
  for update;

  if p_approve then
    update public.tasks
    set status = 'completed', completed_at = now(), reviewed_by = p_admin_id,
        reviewed_at = now(), admin_note = p_note
    where id = p_task_id;

    update public.users
    set credit_balance = credit_balance + 1, updated_at = now()
    where id = v_giver_id;

    insert into public.credit_ledger (user_id, delta, reason, task_id, created_by, note)
    values (v_giver_id, 1, 'give_approved', p_task_id, p_admin_id, p_note);
  else
    update public.tasks
    set status = 'rejected', reviewed_by = p_admin_id, reviewed_at = now(), admin_note = p_note
    where id = p_task_id;

    update public.users
    set credit_balance = credit_balance + 1,
        receive_allowance_balance = receive_allowance_balance
          + case when v_receive_allowance_reserved then 1 else 0 end,
        updated_at = now()
    where id = v_owner_id;

    insert into public.credit_ledger (user_id, delta, reason, task_id, created_by, note)
    values (v_owner_id, 1, 'task_refund', p_task_id, p_admin_id, p_note);
  end if;
end;
$$;

drop function if exists public.skip_business(uuid, uuid);

create function public.skip_business(p_giver_id uuid, p_business_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Asia/Taipei')::date;
  v_skips_today integer;
  v_previous_skip timestamptz;
begin
  perform 1 from public.users where id = p_giver_id for update;
  if not found then raise exception 'User not found.'; end if;

  if not exists (select 1 from public.businesses where id = p_business_id and active = true) then
    raise exception 'Business not found.';
  end if;

  select s.skipped_at
  into v_previous_skip
  from public.skips s
  where s.giver_id = p_giver_id and s.business_id = p_business_id;

  select count(*)::integer
  into v_skips_today
  from public.skips s
  where s.giver_id = p_giver_id
    and (s.skipped_at at time zone 'Asia/Taipei')::date = v_today;

  if v_previous_skip is not null
     and (v_previous_skip at time zone 'Asia/Taipei')::date = v_today then
    return greatest(3 - v_skips_today, 0);
  end if;

  if v_previous_skip is not null and v_previous_skip > now() - interval '7 days' then
    raise exception 'This business was skipped recently.';
  end if;

  if v_skips_today >= 3 then
    raise exception 'Daily skip limit reached. Accept the current match or return tomorrow.';
  end if;

  insert into public.skips (giver_id, business_id, skipped_at)
  values (p_giver_id, p_business_id, now())
  on conflict (giver_id, business_id)
  do update set skipped_at = excluded.skipped_at;

  return 2 - v_skips_today;
end;
$$;

revoke all on function public.get_daily_stats(uuid) from public, anon, authenticated;
revoke all on function public.get_discover_feed(uuid, integer) from public, anon, authenticated;
revoke all on function public.accept_review_task(uuid, uuid) from public, anon, authenticated;
revoke all on function public.expire_overdue_tasks() from public, anon, authenticated;
revoke all on function public.complete_review_task(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.review_submission(uuid, uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.skip_business(uuid, uuid) from public, anon, authenticated;

grant execute on function public.get_daily_stats(uuid) to service_role;
grant execute on function public.get_discover_feed(uuid, integer) to service_role;
grant execute on function public.accept_review_task(uuid, uuid) to service_role;
grant execute on function public.expire_overdue_tasks() to service_role;
grant execute on function public.complete_review_task(uuid, uuid, text) to service_role;
grant execute on function public.review_submission(uuid, uuid, boolean, text) to service_role;
grant execute on function public.skip_business(uuid, uuid) to service_role;
