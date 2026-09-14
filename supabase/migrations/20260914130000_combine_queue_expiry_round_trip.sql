-- getQueue/getQueueTask each made two sequential round-trips to the database
-- on every load (an expiry sweep RPC, then a separate select) instead of one.
-- get_discover_feed already does this correctly by running the sweep inside
-- the function itself; give Queue/Tasks the same treatment.

create or replace function public.get_queue_tasks(p_user_id uuid)
returns setof public.tasks
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.expire_overdue_tasks();
  return query
  select * from public.tasks t
  where t.giver_id = p_user_id
    and t.status in ('accepted', 'submitted')
  order by t.accepted_at desc;
end;
$$;

create or replace function public.get_queue_task(p_user_id uuid, p_task_id uuid)
returns setof public.tasks
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.expire_overdue_tasks();
  return query
  select * from public.tasks t
  where t.id = p_task_id
    and t.giver_id = p_user_id;
end;
$$;

revoke all on function public.get_queue_tasks(uuid) from public, anon, authenticated;
revoke all on function public.get_queue_task(uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_queue_tasks(uuid) to service_role;
grant execute on function public.get_queue_task(uuid, uuid) to service_role;
