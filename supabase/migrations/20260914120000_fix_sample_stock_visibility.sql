-- Fix: businesses were dropping out of Discover the moment their sample-review
-- stock hit 0, even with credit, allowance, and daily cap all still fine.
-- pair_random_review_sample() consumes one sample per accepted task, so any
-- business seeded with only 1 sample (the natural amount to add) vanished
-- from matching after exactly one review. Sample stock should only affect
-- whether a task gets a suggested sample_review_text, never whether the
-- business is discoverable at all.

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

revoke all on function public.get_discover_feed(uuid, integer) from public, anon, authenticated;
grant execute on function public.get_discover_feed(uuid, integer) to service_role;
