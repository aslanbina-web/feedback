begin;

do $test$
declare
  v_inviter uuid;
  v_invitee_one uuid;
  v_invitee_two uuid;
  v_target_owner uuid;
  v_business uuid;
  v_target_business uuid;
  v_task uuid;
  v_first_expiry timestamptz;
begin
  insert into public.users (line_user_id, display_name)
  values ('REG_OA_INVITER_' || gen_random_uuid(), 'REG OA Inviter')
  returning id into v_inviter;

  select public.save_business_card(
    v_inviter, 'REG Inviter Card', 'Professional Services', 'Taipei', 'Xinyi',
    'Regression card.', 'https://maps.google.com/?cid=reg-oa-inviter', true,
    array[]::text[]
  ) into v_business;

  if (select active from public.businesses where id = v_business) then
    raise exception 'An unverified OA business became active.';
  end if;
  if (select plan_activated_at from public.users where id = v_inviter) is not null then
    raise exception 'The Free Plan started before OA verification.';
  end if;

  perform public.confirm_official_line_friend(v_inviter);
  if (select active from public.businesses where id = v_business) then
    raise exception 'A sample-less onboarding business became active.';
  end if;
  if (select plan_activated_at from public.users where id = v_inviter) is null then
    raise exception 'OA verification did not start the Free Plan.';
  end if;

  select public.save_business_card(
    v_inviter, 'REG Inviter Card', 'Professional Services', 'Taipei', 'Xinyi',
    'Regression card.', 'https://maps.google.com/?cid=reg-oa-inviter', true,
    array['Activation sample']
  ) into v_business;
  if not (select active from public.businesses where id = v_business) then
    raise exception 'The first onboarding sample did not activate the business.';
  end if;

  insert into public.users (line_user_id, display_name)
  values ('REG_PERIOD_INVITEE_ONE_' || gen_random_uuid(), 'REG Period Invitee One')
  returning id into v_invitee_one;
  insert into public.users (line_user_id, display_name)
  values ('REG_PERIOD_INVITEE_TWO_' || gen_random_uuid(), 'REG Period Invitee Two')
  returning id into v_invitee_two;

  perform public.claim_referral(v_invitee_one, (select referral_code from public.users where id = v_inviter));
  perform public.claim_referral(v_invitee_two, (select referral_code from public.users where id = v_inviter));

  select public.save_business_card(
    v_invitee_one, 'REG Invitee One', 'Retail / Shop', 'Taipei', 'Zhongshan',
    'Regression card.', 'https://maps.google.com/?cid=reg-period-one', true,
    array['First qualifying sample']
  ) into v_business;
  perform public.confirm_official_line_friend(v_invitee_one);

  select public.save_business_card(
    v_invitee_two, 'REG Invitee Two', 'Retail / Shop', 'Taipei', 'Zhongshan',
    'Regression card.', 'https://maps.google.com/?cid=reg-period-two', true,
    array['Second qualifying sample']
  ) into v_business;
  perform public.confirm_official_line_friend(v_invitee_two);

  insert into public.users (line_user_id, display_name)
  values ('REG_PERIOD_TARGET_' || gen_random_uuid(), 'REG Period Target')
  returning id into v_target_owner;
  insert into public.businesses (
    owner_id, name, category, city, district, generic_description, review_url, active
  ) values (
    v_target_owner, 'REG Period Target', 'Restaurant / Cafe', 'Taipei', 'Da-an',
    'Regression target.', 'https://maps.google.com/?cid=reg-period-target', true
  ) returning id into v_target_business;

  insert into public.tasks (
    giver_id, business_id, status, business_name, business_category,
    business_city, business_district, review_url_snapshot
  ) values (
    v_invitee_one, v_target_business, 'accepted', 'REG Period Target', 'Restaurant / Cafe',
    'Taipei', 'Da-an', 'https://maps.google.com/?cid=reg-period-target'
  ) returning id into v_task;
  update public.tasks set status = 'completed', completed_at = now() where id = v_task;

  select plan_expires_at into v_first_expiry from public.users where id = v_inviter;
  if (select reward_status from public.referrals where invitee_id = v_invitee_one) <> 'rewarded' then
    raise exception 'The first referral did not earn the period reward.';
  end if;

  insert into public.tasks (
    giver_id, business_id, status, business_name, business_category,
    business_city, business_district, review_url_snapshot
  ) values (
    v_invitee_two, v_target_business, 'accepted', 'REG Period Target', 'Restaurant / Cafe',
    'Taipei', 'Da-an', 'https://maps.google.com/?cid=reg-period-target'
  ) returning id into v_task;
  update public.tasks set status = 'completed', completed_at = now() where id = v_task;

  if (select plan_expires_at from public.users where id = v_inviter) <> v_first_expiry then
    raise exception 'A second referral stacked in the same period.';
  end if;
  if (select reward_status from public.referrals where invitee_id = v_invitee_two) <> 'period_limit' then
    raise exception 'The second same-period referral was not closed.';
  end if;
end;
$test$;

rollback;
