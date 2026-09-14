create table public.business_review_samples (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  sample_text text not null check (char_length(btrim(sample_text)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index business_review_samples_business_idx
on public.business_review_samples (business_id, created_at);

alter table public.business_review_samples enable row level security;
revoke all on public.business_review_samples from anon, authenticated;
grant all on public.business_review_samples to service_role;

alter table public.tasks
  add column sample_review_text text;

create or replace function public.pair_random_review_sample()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sample_id uuid;
  v_sample_text text;
begin
  select s.id, s.sample_text
  into v_sample_id, v_sample_text
  from public.business_review_samples s
  where s.business_id = new.business_id
  order by random()
  limit 1
  for update skip locked;

  -- Existing cards remain usable until their owner adds samples.
  if v_sample_id is null then return new; end if;

  delete from public.business_review_samples where id = v_sample_id;
  new.sample_review_text := v_sample_text;
  return new;
end;
$$;

create trigger pair_random_review_sample_before_task
before insert on public.tasks
for each row execute function public.pair_random_review_sample();

create or replace function public.save_business_card(
  p_owner_id uuid,
  p_name text,
  p_category text,
  p_city text,
  p_district text,
  p_generic_description text,
  p_review_url text,
  p_active boolean,
  p_sample_reviews text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid;
begin
  if not exists (select 1 from public.users u where u.id = p_owner_id) then
    raise exception 'User not found.';
  end if;

  insert into public.businesses (
    owner_id, name, category, city, district, generic_description, review_url, active
  ) values (
    p_owner_id, p_name, p_category, p_city, p_district,
    p_generic_description, p_review_url, p_active
  )
  on conflict (owner_id) do update set
    name = excluded.name,
    category = excluded.category,
    city = excluded.city,
    district = excluded.district,
    generic_description = excluded.generic_description,
    review_url = excluded.review_url,
    active = excluded.active,
    updated_at = now()
  returning id into v_business_id;

  delete from public.business_review_samples s
  where s.business_id = v_business_id;

  insert into public.business_review_samples (business_id, sample_text)
  select v_business_id, sample_text
  from (
    select distinct btrim(value) as sample_text
    from unnest(coalesce(p_sample_reviews, array[]::text[])) as value
    where char_length(btrim(value)) between 1 and 500
  ) cleaned;

  return v_business_id;
end;
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
  with expired as materialized (
    select public.expire_overdue_tasks()
  ), giver as (
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
    cross join expired
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

revoke all on function public.pair_random_review_sample() from public, anon, authenticated;
revoke all on function public.save_business_card(uuid, text, text, text, text, text, text, boolean, text[]) from public, anon, authenticated;
revoke all on function public.get_discover_feed(uuid, integer) from public, anon, authenticated;

grant execute on function public.save_business_card(uuid, text, text, text, text, text, text, boolean, text[]) to service_role;
grant execute on function public.get_discover_feed(uuid, integer) to service_role;
