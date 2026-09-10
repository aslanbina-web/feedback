create policy "deny browser access to users"
on public.users for all to anon, authenticated
using (false) with check (false);

create policy "deny browser access to businesses"
on public.businesses for all to anon, authenticated
using (false) with check (false);

create policy "deny browser access to tasks"
on public.tasks for all to anon, authenticated
using (false) with check (false);

create policy "deny browser access to skips"
on public.skips for all to anon, authenticated
using (false) with check (false);

create policy "deny browser access to credit ledger"
on public.credit_ledger for all to anon, authenticated
using (false) with check (false);

create index credit_ledger_created_by_idx on public.credit_ledger (created_by);
create index credit_ledger_task_idx on public.credit_ledger (task_id);
create index skips_business_idx on public.skips (business_id);
create index tasks_reviewed_by_idx on public.tasks (reviewed_by);

