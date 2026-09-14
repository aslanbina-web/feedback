alter table public.tasks
  add column expires_at timestamptz;

update public.tasks
set expires_at = accepted_at + interval '60 minutes'
where status = 'accepted';

create unique index tasks_unique_proof_url
on public.tasks (lower(proof_url))
where proof_url is not null;

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
    select t.id, b.owner_id
    from public.tasks t
    join public.businesses b on b.id = t.business_id
    where t.status = 'accepted'
      and coalesce(t.expires_at, t.accepted_at + interval '60 minutes') <= now()
    order by t.accepted_at
    for update of t skip locked
  loop
    perform 1 from public.users where id = v_task.owner_id for update;

    update public.tasks
    set status = 'expired'
    where id = v_task.id and status = 'accepted';

    if found then
      update public.users
      set credit_balance = credit_balance + 1, updated_at = now()
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

  select t.id, t.giver_id, t.status, t.accepted_at, t.expires_at, b.owner_id
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
    set credit_balance = credit_balance + 1, updated_at = now()
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
  set credit_balance = credit_balance + 1, updated_at = now()
  where id = v_task.giver_id;

  insert into public.credit_ledger (user_id, delta, reason, task_id, note)
  values (v_task.giver_id, 1, 'give_approved', p_task_id, 'Automatically completed after proof submission');

  return 'completed';
end;
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

  perform 1 from public.users u where u.id in (p_giver_id, v_owner_id) order by u.id for update;
  select u.daily_give_limit into v_giver_limit from public.users u where u.id = p_giver_id;
  if v_giver_limit is null then raise exception 'User not found.'; end if;
  select u.credit_balance, u.daily_receive_limit into v_owner_credits, v_owner_limit from public.users u where u.id = v_owner_id;
  if v_owner_credits < 1 then raise exception 'This business has no receive credit.'; end if;

  if exists (select 1 from public.tasks t where t.giver_id = p_giver_id and t.business_id = p_business_id and t.status in ('accepted', 'submitted', 'completed')) then
    raise exception 'You already accepted or completed this business.';
  end if;
  if exists (select 1 from public.skips s where s.giver_id = p_giver_id and s.business_id = p_business_id and s.skipped_at > now() - interval '30 days') then
    raise exception 'This business was skipped recently.';
  end if;
  if (select count(*) from public.tasks t where t.giver_id = p_giver_id and (t.accepted_at at time zone 'Asia/Taipei')::date = (now() at time zone 'Asia/Taipei')::date) >= v_giver_limit then
    raise exception 'Daily give limit reached.';
  end if;
  if (select count(*) from public.tasks t join public.businesses b on b.id = t.business_id where b.owner_id = v_owner_id and (t.accepted_at at time zone 'Asia/Taipei')::date = (now() at time zone 'Asia/Taipei')::date) >= v_owner_limit then
    raise exception 'This business reached its daily receive limit.';
  end if;

  insert into public.tasks (giver_id, business_id, business_name, business_category, business_city, business_district, review_url_snapshot, expires_at)
  values (p_giver_id, p_business_id, v_business_name, v_business_category, v_business_city, v_business_district, v_review_url, now() + interval '60 minutes')
  returning id into v_task_id;

  update public.users set credit_balance = credit_balance - 1, updated_at = now() where id = v_owner_id;
  insert into public.credit_ledger (user_id, delta, reason, task_id) values (v_owner_id, -1, 'task_reserved', v_task_id);
  return v_task_id;
end;
$$;

revoke all on function public.expire_overdue_tasks() from public, anon, authenticated;
revoke all on function public.complete_review_task(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.accept_review_task(uuid, uuid) from public, anon, authenticated;
grant execute on function public.expire_overdue_tasks() to service_role;
grant execute on function public.complete_review_task(uuid, uuid, text) to service_role;
grant execute on function public.accept_review_task(uuid, uuid) to service_role;
