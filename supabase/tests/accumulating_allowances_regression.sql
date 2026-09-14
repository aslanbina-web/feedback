begin;

-- Final lifecycle regression: saved passes, exclusive assignments, no skip,
-- sample consumption, expiry refunds, immediate credit, stored proof URL,
-- reciprocal exclusion, and referral qualification.
do $$
declare
  v_today date := (now() at time zone 'Asia/Taipei')::date;
  v_giver uuid;
  v_owner uuid;
  v_business uuid;
  v_businesses uuid[] := array[]::uuid[];
  v_assignments uuid[];
  v_tasks uuid[] := array[]::uuid[];
  v_assignment uuid;
  v_task uuid;
  v_user uuid;
  v_result text;
  v_stats record;
  v_inviter uuid;
  v_invitee uuid;
  v_inviter_expiry timestamptz;
  i integer;
begin
  insert into public.users (line_user_id, display_name, allowance_accrued_on)
  values ('REG_GIVER_' || gen_random_uuid(), 'REG Give User', v_today - 4)
  returning id into v_giver;

  for i in 1..8 loop
    insert into public.users (line_user_id, display_name, credit_balance, allowance_accrued_on)
    values ('REG_OWNER_' || i || '_' || gen_random_uuid(), 'REG Owner ' || i, 10, v_today - 4)
    returning id into v_owner;
    insert into public.businesses (owner_id, name, category, city, district, generic_description, review_url)
    values (v_owner, 'REG Business ' || i, 'Beauty Salon', 'Taipei', 'Test District',
      'Regression scenario.', 'https://maps.google.com/maps?cid=' || i)
    returning id into v_business;
    v_businesses := array_append(v_businesses, v_business);
    insert into public.business_review_samples (business_id, sample_text)
    select v_business, 'REG Sample ' || i || '-' || n from generate_series(1, 4) n;
  end loop;

  select array_agg(assignment_id order by assignment_id) into v_assignments
  from public.get_discover_feed(v_giver, 3);
  if coalesce(array_length(v_assignments, 1), 0) <> 3 then
    raise exception 'Expected three accumulated assignments.';
  end if;

  for i in 1..3 loop
    select public.accept_review_task(v_giver, v_assignments[i]) into v_task;
    v_tasks := array_append(v_tasks, v_task);
  end loop;

  if (select sample_review_text from public.tasks where id = v_tasks[1]) is null then
    raise exception 'Accepted task did not receive a sample review.';
  end if;
  if (select count(*) from public.business_review_samples s join public.tasks t on t.business_id = s.business_id where t.id = v_tasks[1]) <> 3 then
    raise exception 'Paired sample was not removed from the available list.';
  end if;
  if (select give_allowance_balance from public.users where id = v_giver) <> 2 then
    raise exception 'Give passes did not accrue and decrement correctly.';
  end if;

  insert into public.match_assignments (giver_id, business_id)
  values (v_giver, v_businesses[4]) returning id into v_assignment;
  begin
    perform public.accept_review_task(v_giver, v_assignment);
    raise exception 'REG_EXPECTED_GIVE_LIMIT';
  exception when others then
    if sqlerrm = 'REG_EXPECTED_GIVE_LIMIT' then raise; end if;
    if sqlerrm <> 'Daily Give maximum reached.' then
      raise exception 'Unexpected fourth-Give error: %', sqlerrm;
    end if;
  end;

  select public.complete_review_task(v_giver, v_tasks[1],
    'https://maps.app.goo.gl/GiveGetAllowanceRegressionOne') into v_result;
  if v_result <> 'completed' then raise exception 'Task did not complete.'; end if;
  if (select credit_balance from public.users where id = v_giver) <> 1 then
    raise exception 'Completed Give did not award exactly one credit.';
  end if;
  if (select proof_url from public.tasks where id = v_tasks[1])
     <> 'https://maps.app.goo.gl/GiveGetAllowanceRegressionOne' then
    raise exception 'Completed review URL was not retained.';
  end if;

  begin
    perform public.complete_review_task(v_giver, v_tasks[1],
      'https://maps.app.goo.gl/GiveGetAllowanceRegressionTwo');
    raise exception 'REG_EXPECTED_DUPLICATE_COMPLETION';
  exception when others then
    if sqlerrm = 'REG_EXPECTED_DUPLICATE_COMPLETION' then raise; end if;
    if sqlerrm <> 'Task is no longer available for submission.' then
      raise exception 'Unexpected duplicate-completion error: %', sqlerrm;
    end if;
  end;

  begin
    perform public.complete_review_task(v_giver, v_tasks[2],
      'https://maps.app.goo.gl/GiveGetAllowanceRegressionOne');
    raise exception 'REG_EXPECTED_DUPLICATE_PROOF';
  exception when unique_violation then null;
  end;

  select b.owner_id into v_owner from public.tasks t
  join public.businesses b on b.id = t.business_id where t.id = v_tasks[2];
  update public.tasks set expires_at = now() - interval '1 second' where id = v_tasks[2];
  if public.expire_overdue_tasks() <> 1 then raise exception 'Expected one expired task.'; end if;
  if public.expire_overdue_tasks() <> 0 then raise exception 'Expiry refund was not idempotent.'; end if;
  if (select credit_balance from public.users where id = v_owner) <> 10 then
    raise exception 'Expired task did not refund the receiver credit.';
  end if;
  if (select receive_allowance_balance from public.users where id = v_owner) <> 5 then
    raise exception 'Expired task did not refund the Receive pass.';
  end if;

  select * into v_stats from public.get_daily_stats(v_giver);
  if v_stats.gives <> 3 or v_stats.give_allowance <> 2 then
    raise exception 'Daily stats are incorrect.';
  end if;

  -- Only one giver can see a business during its 30-minute assignment.
  update public.businesses set active = false;
  update public.businesses set active = true where id = v_businesses[8];
  insert into public.users (line_user_id, display_name)
  values ('REG_EXCLUSIVE_A_' || gen_random_uuid(), 'REG Exclusive A') returning id into v_user;
  perform public.get_discover_feed(v_user, 1);
  insert into public.users (line_user_id, display_name)
  values ('REG_EXCLUSIVE_B_' || gen_random_uuid(), 'REG Exclusive B') returning id into v_owner;
  if exists (select 1 from public.get_discover_feed(v_owner, 1)) then
    raise exception 'An active card was shown to a second giver.';
  end if;

  -- Direct reciprocal matching is excluded.
  insert into public.users (line_user_id, display_name, credit_balance)
  values ('REG_RECIP_GIVER_' || gen_random_uuid(), 'REG Reciprocal Giver', 3) returning id into v_user;
  insert into public.businesses (owner_id, name, category, city, district, generic_description, review_url)
  values (v_user, 'REG Giver Card', 'Beauty Salon', 'Taipei', 'Test District', 'Giver card.',
    'https://maps.google.com/maps?cid=giver') returning id into v_business;
  insert into public.business_review_samples values (gen_random_uuid(), v_business, 'Giver sample', now());
  insert into public.users (line_user_id, display_name, credit_balance)
  values ('REG_RECIP_OWNER_' || gen_random_uuid(), 'REG Reciprocal Owner', 3) returning id into v_owner;
  insert into public.businesses (owner_id, name, category, city, district, generic_description, review_url)
  values (v_owner, 'REG Reciprocal Card', 'Beauty Salon', 'Taipei', 'Test District', 'Reciprocal card.',
    'https://maps.google.com/maps?cid=reciprocal') returning id into v_assignment;
  insert into public.business_review_samples values (gen_random_uuid(), v_assignment, 'Reciprocal sample', now());
  insert into public.tasks (giver_id, business_id, status, business_name, business_category,
    business_city, business_district, review_url_snapshot, completed_at)
  values (v_owner, v_business, 'completed', 'REG Giver Card', 'Beauty Salon', 'Taipei',
    'Test District', 'https://maps.google.com/maps?cid=giver', now());
  update public.businesses set active = false;
  update public.businesses set active = true where id = v_assignment;
  if exists (select 1 from public.get_discover_feed(v_user, 1)) then
    raise exception 'A direct reciprocal match was assigned.';
  end if;

  -- Referral rewards the inviter only after card + sample + invitee first Give.
  insert into public.users (line_user_id, display_name)
  values ('REG_INVITER_' || gen_random_uuid(), 'REG Inviter') returning id into v_inviter;
  select plan_expires_at into v_inviter_expiry from public.users where id = v_inviter;
  insert into public.users (line_user_id, display_name)
  values ('REG_INVITEE_' || gen_random_uuid(), 'REG Invitee') returning id into v_invitee;
  if not public.claim_referral(v_invitee, (select referral_code from public.users where id = v_inviter)) then
    raise exception 'Referral claim failed.';
  end if;
  insert into public.businesses (owner_id, name, category, city, district, generic_description, review_url)
  values (v_invitee, 'REG Invitee Card', 'Beauty Salon', 'Taipei', 'Test District', 'Invitee card.',
    'https://maps.google.com/maps?cid=invitee') returning id into v_business;
  insert into public.business_review_samples values (gen_random_uuid(), v_business, 'Invitee sample', now());
  insert into public.users (line_user_id, display_name, credit_balance)
  values ('REG_REFERRAL_OWNER_' || gen_random_uuid(), 'REG Referral Owner', 3) returning id into v_owner;
  insert into public.businesses (owner_id, name, category, city, district, generic_description, review_url)
  values (v_owner, 'REG Referral Target', 'Beauty Salon', 'Taipei', 'Test District', 'Referral target.',
    'https://maps.google.com/maps?cid=referral') returning id into v_business;
  insert into public.business_review_samples values (gen_random_uuid(), v_business, 'Referral sample', now());
  insert into public.match_assignments (giver_id, business_id)
  values (v_invitee, v_business) returning id into v_assignment;
  select public.accept_review_task(v_invitee, v_assignment) into v_task;
  perform public.complete_review_task(v_invitee, v_task,
    'https://maps.app.goo.gl/GiveGetReferralRegression');
  if (select rewarded_at from public.referrals where invitee_id = v_invitee) is null then
    raise exception 'Qualified referral was not rewarded.';
  end if;
  if (select plan_expires_at from public.users where id = v_inviter)
     < v_inviter_expiry + interval '29 days 23 hours' then
    raise exception 'Inviter did not receive the 30-day extension.';
  end if;
  if (select plan_expires_at from public.users where id = v_invitee) > now() + interval '31 days' then
    raise exception 'Reward was incorrectly applied to the invitee.';
  end if;
end;
$$;

rollback;
