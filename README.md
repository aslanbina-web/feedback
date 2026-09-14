# GiveGet

GiveGet is a private, LINE-gated review task exchange for local businesses. It uses the approved playful, retro-cartoon mobile UI.

## Current milestone

The original `candor.html` remains as the visual reference. The real application now includes:

- Next.js App Router and installable PWA structure
- LINE Login with an optional Official LINE friendship gate for new accounts
- internal UUID identities, independent of LINE
- masked Discover cards before acceptance
- exact business details revealed only in the accepted task Queue
- one accumulating Give pass and one accumulating Receive pass per Taipei day
- hard maximums of 3 gives and 3 receives per day
- one completed give earning one accumulating get credit
- atomic credit reservation at acceptance
- own-business, previous-completion, direct-reciprocal, zero-credit and receive-cap exclusions
- direct reciprocal matches excluded
- up to three exclusive, system-assigned cards that rotate after 30 minutes
- Home, Discover, Accept, Review, Submit, Tasks, History, My Card, Sample Reviews, Invite, Notifications, Settings and Admin screens
- automatic completion after a unique valid Google review link, task issue reports, plus auditable credit adjustments
- referral attribution with a 30-day inviter reward after the invitee creates a card, adds a sample and completes their first Give

## Stack and security

- Next.js + TypeScript
- Supabase Postgres
- custom server-side LINE OAuth
- signed HTTP-only internal sessions
- Vercel deployment target

All database access is server-only. Exposed tables have RLS enabled and no browser-role grants. Sensitive matching and balance changes are performed by locked Postgres functions.

## Local setup

1. Run `pnpm install`.
2. Create a Supabase project and apply every file in `supabase/migrations` in filename order.
3. Copy `.env.example` to `.env.local` and enter the Supabase and LINE values.
4. Add `http://localhost:3000/api/auth/line/callback` to the LINE Login channel. Link the Official Account to that channel if `SIGNUP_REQUIRES_OA_FRIEND=true`.
5. Run `pnpm dev`.
6. Promote the first account once in Supabase:

   ```sql
   update public.users set role = 'admin' where line_user_id = 'THE_LINE_USER_ID';
   ```

7. Use Admin for a documented initial onboarding credit grant. Completed gives sustain the exchange after that.

### LINE callback

Register exactly this URL in the LINE Login channel, replacing the domain with the deployed GiveGet domain:

```text
https://YOUR-DOMAIN/api/auth/line/callback
```

The server validates a unique state and nonce, verifies both tokens with LINE, checks Official Account friendship for new members, then creates or updates the internal UUID account. LINE access and refresh tokens are not stored.

## Product rules encoded server-side

- One Give pass and one Receive pass accrue each Taipei day without expiring.
- No more than 3 Gives or 3 Receives can be used in one day.
- Accepting atomically consumes the giver's Give pass and reserves the recipient's Receive pass and credit.
- A valid submitted Google review link completes the task and grants the giver exactly one credit.
- Expiry or legacy rejection refunds the recipient's reserved pass and credit exactly once.
- Eligible businesses are assigned exclusively for 30 minutes; there is no skip or cancel action.
- A completed business does not return to the same giver.
- Credits do not expire.

## Legacy prototype

`candor.html` is retained only for design comparison and is not part of the production data path.

Deployment configured.
