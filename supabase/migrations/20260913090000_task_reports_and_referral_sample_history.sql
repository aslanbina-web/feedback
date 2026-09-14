-- Durable task reports and historical referral sample qualification.

alter table public.businesses
  add column sample_review_added_at timestamptz;

update public.businesses b
set sample_review_added_at = coalesce(
  (select min(s.created_at) from public.business_review_samples s where s.business_id = b.id),
  b.updated_at
)
where exists (
  select 1 from public.business_review_samples s where s.business_id = b.id
);

create or replace function public.remember_business_sample_added()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.businesses
  set sample_review_added_at = coalesce(sample_review_added_at, new.created_at)
  where id = new.business_id;
  return new;
end;
$$;

create trigger remember_business_sample_added_after_insert
after insert on public.business_review_samples
for each row execute function public.remember_business_sample_added();

create table public.task_reports (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  reporter_id uuid not null references public.users(id) on delete cascade,
  reason text not null check (reason in ('review_missing', 'wrong_business', 'other')),
  details text check (details is null or char_length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create unique index task_reports_one_open_per_reporter_idx
on public.task_reports (task_id, reporter_id) where status = 'open';
create index task_reports_open_created_idx
on public.task_reports (created_at) where status = 'open';

alter table public.task_reports enable row level security;
revoke all on public.task_reports from public, anon, authenticated;
grant all on public.task_reports to service_role;

create or replace function public.report_review_task(
  p_reporter_id uuid,
  p_task_id uuid,
  p_reason text,
  p_details text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report_id uuid;
begin
  if p_reason not in ('review_missing', 'wrong_business', 'other') then
    raise exception 'Choose a valid report reason.';
  end if;
  if not exists (
    select 1
    from public.tasks t
    join public.businesses b on b.id = t.business_id
    where t.id = p_task_id
      and (t.giver_id = p_reporter_id or b.owner_id = p_reporter_id)
  ) then
    raise exception 'Task is not available to report.';
  end if;

  insert into public.task_reports (task_id, reporter_id, reason, details)
  values (p_task_id, p_reporter_id, p_reason, nullif(btrim(p_details), ''))
  on conflict (task_id, reporter_id) where status = 'open'
  do update set reason = excluded.reason, details = excluded.details, created_at = now()
  returning id into v_report_id;
  return v_report_id;
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
    set plan_expires_at = greatest(plan_expires_at, now()) + interval '30 days', updated_at = now()
    where id = v_referral.inviter_id;
  end if;
  return new;
end;
$$;

revoke all on function public.remember_business_sample_added() from public, anon, authenticated;
revoke all on function public.report_review_task(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.report_review_task(uuid, uuid, text, text) to service_role;
