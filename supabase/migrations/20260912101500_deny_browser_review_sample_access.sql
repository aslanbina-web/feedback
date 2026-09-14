create policy "deny browser access to business review samples"
on public.business_review_samples
for all
to anon, authenticated
using (false)
with check (false);
