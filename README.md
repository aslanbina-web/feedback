# GiveGet

GiveGet is a private, LINE-gated review task exchange for local businesses. It intentionally keeps the flat, old-school visual language of the original prototype.

## Current milestone

The original `candor.html` remains as the visual reference. The real application now includes:

- Next.js App Router and installable PWA structure
- LINE Login with an optional Official LINE friendship gate for new accounts
- internal UUID identities, independent of LINE
- masked Discover cards before acceptance
- exact business details revealed only in the accepted task Queue
- fixed trial limits of 3 gives and 3 receives per Taipei day
- one approved give earning one accumulating get credit
- atomic credit reservation at acceptance
- own-business, previous-completion, recent-skip, zero-credit and receive-cap exclusions
- reciprocal matches ranked behind non-reciprocal choices
- Home, Discover, Tasks, History, My Card and Admin screens
- admin proof review and auditable credit adjustments

## Stack and security

- Next.js + TypeScript
- Supabase Postgres
- custom server-side LINE OAuth
- signed HTTP-only internal sessions
- Vercel deployment target

All database access is server-only. Exposed tables have RLS enabled and no browser-role grants. Sensitive matching and balance changes are performed by locked Postgres functions.

## Local setup

1. Run `pnpm install`.
2. Create a Supabase project and apply `supabase/migrations/20260910193000_giveget_mvp.sql`.
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

- Accepting a task counts against both daily caps.
- The recipient's credit is reserved in the acceptance transaction.
- Approval grants the giver exactly one credit.
- Rejection refunds the recipient's reserved credit.
- Skipped businesses stay hidden for 30 days.
- A completed business does not return to the same giver.
- Credits do not expire.

## Legacy prototype

`candor.html` is retained only for design comparison and is not part of the production data path.
