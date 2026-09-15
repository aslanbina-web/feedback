-- Smooth account creation, delayed Official LINE activation, and one
-- referral reward per 30-day plan period.

alter table public.users
  add column oa_friend_verified_at timestamptz,
  add column plan_activated_at timestamptz,
  add column referral_reward_available_from timestamptz not null default now();

-- New accounts have no active plan until both their card and OA friendship
-- are confirmed. Existing accounts keep their current expiry unchanged.
alter table public.users
  alter column plan_expires_at set default now();

-- Everyone who existed before this migration already passed the old
-- Official LINE requirement (or is an internal regression account).
update public.users
set
  oa_friend_verified_at = coalesce(oa_friend_verified_at, created_at),
  plan_activated_at = coalesce(plan_activated_at, plan_started_at),
  referral_reward_available_from = plan_started_at;

alter table public.referrals
  add column reward_status text not null default 'pending'
    check (reward_status in ('pending', 'rewarded', 'period_limit'));

update public.referrals
set reward_status = case when rewarded_at is not null then 'rewarded' else 'pending' end;

-- Called only after the server verifies a fresh LINE access token and the
-- friendship endpoint confirms the user follows the Official Account.
create or replace function public.confirm_official_line_friend(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_has_business boolean;
  v_needs_activation boolean;
begin
  select
    exists (select 1 from public.businesses b where b.owner_id = u.id),
    u.plan_activated_at is null
  into v_has_business, v_needs_activation
  from public.users u
  where u.id = p_user_id
  for update;

  if not found then return false; end if;

  update public.users
  set
    oa_friend_verified_at = coalesce(oa_friend_verified_at, now()),
    updated_at = now()
  where id = p_user_id;

  if v_has_business and v_needs_activation then
    update public.users
    set
      plan_activated_at = now(),
      plan_started_at = now(),
      plan_expires_at = now() + interval '30 days',
      plan_give_limit = 30,
      plan_receive_limit = 30,
      referral_reward_available_from = now(),
      updated_at = now()
    where id = p_user_id;

    update public.businesses
    set active = true, updated_at = now()
    where owner_id = p_user_id
      and exists (
        select 1 from public.business_review_samples s
        where s.business_id = public.businesses.id
      );
  end if;

  return true;
end;
$$;

-- An unverified member may save their card, but it cannot enter Discover.
-- If they already followed the OA before creating the card, saving the card
-- activates their 30-day plan immediately.
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
  v_oa_verified boolean;
  v_needs_activation boolean;
  v_onboarding_complete boolean;
  v_has_samples boolean;
  v_effective_active boolean;
begin
  select
    u.oa_friend_verified_at is not null,
    u.plan_activated_at is null,
    u.onboarding_completed_at is not null
  into v_oa_verified, v_needs_activation, v_onboarding_complete
  from public.users u
  where u.id = p_owner_id
  for update;

  if not found then raise exception 'User not found.'; end if;

  select exists (
    select 1
    from unnest(coalesce(p_sample_reviews, array[]::text[])) as value
    where char_length(btrim(value)) between 1 and 500
  ) into v_has_samples;
  v_effective_active := v_oa_verified and case
    when v_onboarding_complete then p_active
    else v_has_samples
  end;

  insert into public.businesses (
    owner_id, name, category, city, district, generic_description, review_url, active
  ) values (
    p_owner_id, p_name, p_category, p_city, p_district,
    p_generic_description, p_review_url, v_effective_active
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

  if v_oa_verified and v_needs_activation then
    update public.users
    set
      plan_activated_at = now(),
      plan_started_at = now(),
      plan_expires_at = now() + interval '30 days',
      plan_give_limit = 30,
      plan_receive_limit = 30,
      referral_reward_available_from = now(),
      updated_at = now()
    where id = p_owner_id;
  end if;

  return v_business_id;
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
  v_inviter public.users%rowtype;
  v_extension_start timestamptz;
  v_next_reward_at timestamptz;
begin
  if new.status <> 'completed' or old.status = 'completed' then return new; end if;

  select * into v_referral
  from public.referrals r
  where r.invitee_id = new.giver_id
    and r.reward_status = 'pending'
    and exists (
      select 1
      from public.businesses b
      join public.users invitee on invitee.id = b.owner_id
      where b.owner_id = r.invitee_id
        and b.active = true
        and invitee.oa_friend_verified_at is not null
        and invitee.plan_activated_at is not null
        and b.sample_review_added_at is not null
    )
  for update;

  if v_referral.id is null then return new; end if;

  update public.referrals
  set qualified_at = coalesce(qualified_at, now())
  where id = v_referral.id;

  select * into v_inviter
  from public.users u
  where u.id = v_referral.inviter_id
  for update;

  -- Referrals made before the current reward window, or qualified while the
  -- current period's reward is already secured, never queue or stack.
  if v_referral.created_at < v_inviter.referral_reward_available_from
     or v_inviter.referral_reward_available_from > now() then
    update public.referrals
    set reward_status = 'period_limit'
    where id = v_referral.id;
    return new;
  end if;

  v_extension_start := greatest(v_inviter.plan_expires_at, now());
  v_next_reward_at := case
    when v_inviter.plan_expires_at > now() then v_inviter.plan_expires_at
    else now() + interval '30 days'
  end;

  update public.referrals
  set reward_status = 'rewarded', rewarded_at = now()
  where id = v_referral.id and reward_status = 'pending';

  if found then
    update public.users
    set
      plan_expires_at = v_extension_start + interval '30 days',
      plan_give_limit = plan_give_limit + 30,
      plan_receive_limit = plan_receive_limit + 30,
      referral_reward_available_from = v_next_reward_at,
      updated_at = now()
    where id = v_referral.inviter_id;
  end if;

  return new;
end;
$$;

revoke all on function public.confirm_official_line_friend(uuid) from public, anon, authenticated;
revoke all on function public.save_business_card(uuid, text, text, text, text, text, text, boolean, text[]) from public, anon, authenticated;
revoke all on function public.reward_qualified_referral() from public, anon, authenticated;
grant execute on function public.confirm_official_line_friend(uuid) to service_role;
grant execute on function public.save_business_card(uuid, text, text, text, text, text, text, boolean, text[]) to service_role;
