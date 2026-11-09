# BIRTHDAY://PROTOCOL

A personal birthday invitation app with a purple/cyan cyberpunk theme, mobile-first and cinematic,
using a playful GitHub Pull Request visual language. Each guest gets a unique link, opens the
invitation without logging in, and RSVPs for exactly one person with no +1. The host manages guests
one at a time from an admin dashboard.

The full specification lives in [docs/PRD.md](docs/PRD.md). What was actually tested, and what was
not, is recorded in [docs/VERIFICATION.md](docs/VERIFICATION.md).

---

## 1. Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 20.9 or newer (developed on Node 26) |
| npm | 10 or newer |
| Supabase account | the free plan is enough |
| Vercel account | only if you want to deploy |

The package manager is **npm**, and `package-lock.json` is committed. Every dependency is pinned to
an exact version (never `latest`) so builds are reproducible.

---

## 2. Local setup

```bash
npm install
cp .env.example .env.local
```

Then fill in `.env.local` as described below. Without Supabase configured the app still runs: pages
show an honest setup notice, and `/demo` still works. Sign-in and RSVP saving are **not** faked.

```bash
npm run dev        # http://localhost:3000
```

Other commands:

```bash
npm run typecheck      # TypeScript strict, no emit
npm test               # unit tests (node:test + tsx)
npm run build          # production build
npm run start          # serve the build
npm run hash-password  # generate INVITE_PASSWORD_HASH
```

---

## 3. Environment variables

| Name | Scope | Purpose |
|---|---|---|
| `SUPABASE_URL` | server | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | server | publishable/anon key; constrained by RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | server | bypasses RLS; never give it a `NEXT_PUBLIC` prefix |
| `SITE_URL` | server | base for the invitation links you share |
| `INVITE_PASSWORD_HASH` | server | SHA-256 of the "key to join" |
| `ADDITIONAL_ALLOWED_ORIGINS` | server, optional | extra origins allowed to send mutations, comma separated |
| `TRUSTED_IP_HEADER` | server, optional | only when hosting behind a proxy other than Vercel |

> **No variable uses the `NEXT_PUBLIC_` prefix.** The browser never contacts Supabase directly —
> admin sign-in runs through a server route — so the URL and publishable key never need to reach the
> client bundle. The older `NEXT_PUBLIC_`-prefixed names are still read as a fallback so existing
> setups keep working.
>
> `SITE_URL` decides the domain used in the invitation links you share. If it is wrong the app still
> works (CSRF protection relies on `Sec-Fetch-Site`), but generated links will point at the wrong
> domain — so set it correctly anyway.

### Generating `INVITE_PASSWORD_HASH`

```bash
npm run hash-password
# Enter the birthday (DDMMYYYY): [input is hidden]
# INVITE_PASSWORD_HASH=<64 hex characters>
```

The script reads the input **hidden** from the terminal, or from stdin when piped
(`printf '...' | npm run hash-password --silent`). It **refuses** the password as a shell argument,
because arguments are kept in shell history and visible in the process list. Only the hash is
printed.

Copy the resulting line into `.env.local`, and into your Vercel environment variables as a server
variable.

---

## 4. Creating the Supabase project

1. Create a new project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Open **Project Settings → API Keys** and copy:
   - *Project URL* → `SUPABASE_URL`
   - *publishable* / *anon* key → `SUPABASE_PUBLISHABLE_KEY`
   - *service_role* / *secret* key → `SUPABASE_SERVICE_ROLE_KEY`

---

## 5. Running the migrations

Open the **SQL Editor** in the Supabase dashboard and run, in order:

1. `supabase/migrations/0001_init.sql` — tables, constraints, indexes, RLS + policies, RPCs,
   grants/revokes.
2. `supabase/migrations/0002_seed.sql` — a single event row of **placeholders**. The date and RSVP
   deadline are deliberately `NULL`; no date or location is invented. Idempotent.

There are also two convenience files that combine the above into single pastes:
`supabase/SETUP-1-schema.sql` and `supabase/SETUP-2-admin.sql`.

> Both migrations were tested against a real PostgreSQL 16 instance, including being run twice to
> confirm idempotency. Details in [docs/VERIFICATION.md](docs/VERIFICATION.md).

Using the Supabase CLI instead:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

### What the migrations do

- `rsvp_status` enum (`attending` / `maybe` / `declined`) — any other value is rejected by the DB.
- `guests.token_hash` UNIQUE NOT NULL; only the SHA-256 is stored, **never** the raw token.
- `rsvps.guest_id` UNIQUE — one invitation means at most one active response. No `guest_count`.
- Constraint `events_deadline_before_start`: the RSVP deadline cannot be after the event start.
- RLS enabled **and** forced on every table. `anon` gets no privileges at all; `authenticated` gets
  `SELECT` only, which policies then narrow to allowlisted admins.
- RPC `submit_rsvp` (SECURITY DEFINER) re-validates the active token and the deadline **inside the
  same transaction as the write**, with a row lock, and rejects `attending` without a verified
  password flag.
- RPCs `consume_rate_limit` / `reset_rate_limit` / `purge_expired_rate_limits` back the persistent
  limiter.
- Every sensitive function is `revoke`d from `PUBLIC`/`anon`/`authenticated` and `grant`ed only to
  `service_role`. (PostgreSQL grants `EXECUTE` to `PUBLIC` by default — this is revoked explicitly.)

---

## 6. Creating the admin account and allowlist

There is no public sign-up, and no path from the browser to make yourself an admin.

1. **Authentication → Users → Add user**. Enter an email and password, and tick *Auto Confirm User*.
2. Run `supabase/migrations/0003_admin_allowlist.sql.example` in the SQL Editor after replacing the
   email:

```sql
insert into public.admin_users (user_id, note)
select id, 'primary host'
from auth.users
where email = 'your-admin-email@example.com'
on conflict (user_id) do nothing;
```

3. Verify:

```sql
select au.user_id, u.email
from public.admin_users au
join auth.users u on u.id = au.user_id;
```

An account that can sign in but is **not** in `admin_users` is rejected with the same generic
message as a wrong password.

---

## 7. How it is used

### Host

1. Open `/admin` → you are routed to sign-in or the dashboard depending on your session.
2. Fill in **Event settings**: title, host, time zone, date, location, dress code, description,
   RSVP deadline. The date fields state which time zone they are read in.
3. **Create an invitation** per guest. The raw link appears **once**, with a copy button.
4. Send the link to the guest (manually, or via the optional WhatsApp button).
5. Watch the summary and guest list; search by name, filter by status, and refresh.
6. **Regenerate link** if a link leaks — the old one dies immediately, the RSVP is kept.
   **Disable link** rejects access without deleting history.

> The database stores only the token hash, so a link **cannot be shown again**. The only option is
> to regenerate it, which invalidates the previous link.

### Guest

1. Open the personal link → name, event details, and the RSVP form appear **immediately, with no
   password**.
2. Choose **Attending**, **Maybe**, or **Can't make it**, plus an optional message (max 500 chars).
3. For **Attending** only, enter the event key (the host's birthday) and save.
4. Once the server confirms, the merge animation plays and the **digital party pass** appears.
5. Reopening the link shows the invitation and the saved pass **without** entering the key again.

---

## 8. The "key to join" (birthday password)

- The invitation is opened by the **personal token**, not by a password.
- The password is only a key when **saving** an `attending` answer. `maybe` and `declined` never
  require it.
- Accepted: two-digit day, two-digit month, four-digit year — with **no separator** (`DDMMYYYY`,
  the format shown to guests), or with dot **or** hyphen separators used **consistently**
  (`DD.MM.YYYY` / `DD-MM-YYYY`), after trimming outer whitespace. The server normalises to
  `YYYY-MM-DD` before comparing hashes, so the canonical form — and therefore an already configured
  `INVITE_PASSWORD_HASH` — is unchanged.
- Rejected: mixed separators, other formats, single digits, wrong digit counts, dates that do not
  exist, and wrong values.
- Verification happens **entirely on the server**, before the write. The active token, the deadline,
  the password and the payload must all pass first — no `attending` is ever saved first and checked
  afterwards.
- **Every** `attending` submission requires the password again, including changing a response or
  only editing the message. There is no unlock session, password cookie, or `INVITE_SESSION_SECRET`.
- On a wrong or empty password the previous response is **unchanged**, no new pass is issued, the
  error appears next to the password field, and the choice and message are preserved for a retry.
- Changing `attending` → `maybe`/`declined` needs no password and removes the active pass. Going
  back to `attending` requires the password again.

> **The security model:** a birthday is a shared secret that people close to you can easily know. It
> is a **key to confirm attendance**, not identity verification. The same applies to the invitation
> link: it is a *bearer credential* — anyone holding it can read the invitation and change one RSVP.
> The system limits one slot per invitation; it does not guarantee who the person is.

---

## 9. Rate limiting

A **persistent** limiter backed by PostgreSQL (`rate_limits` + the `consume_rate_limit` RPC), so it
still holds on Vercel serverless — unlike an in-memory limiter, which provides no distributed
protection.

| Operation | Initial threshold |
|---|---|
| Reading an invitation | 60 / minute / IP |
| Saving an RSVP | 10 / minute / token + 30 / minute / IP |
| `attending` password attempts | 5 / 15 min per (IP, token) + 20 / 15 min per IP |
| Admin sign-in | 5 / 15 min / IP |

Details:

- **Identifiers are hashed.** A bucket is the SHA-256 of `(rule name | IP | token hash)`, so no raw
  IP or token is ever stored.
- **Behaviour when the limiter fails.** Password attempts and RSVPs **fail closed** (rejected) — a
  limiter failure must not silently open everything. Reading an invitation **fails open**, so guests
  are not locked out of reading because of an infrastructure problem.
- **Successful attempts reset the counter**, so they do not consume quota.
- **IP source.** Platform headers (`x-vercel-forwarded-for` / `x-forwarded-for`), not arbitrary ones.
  Outside Vercel, set `TRUSTED_IP_HEADER` to match your proxy.
- **Cleanup.** Run `select public.purge_expired_rate_limits();` periodically (pg_cron or a scheduled
  function). The limiter stays correct without it; only the table grows.
- A wrong key does **not** block reading the invitation or choosing `maybe`/`declined`.

---

## 10. Manual testing

Once the migrations and the admin account are ready:

| # | Step | Expected |
|---|---|---|
| 1 | Sign in as a valid admin | Dashboard opens |
| 2 | Sign in as non-admin / wrong password | Same generic message |
| 3 | Open `/admin/dashboard` signed out | Redirected to `/admin/login` |
| 4 | Add a guest | Link appears once and can be copied |
| 5 | Open the link | Name + details + form appear, no password |
| 6 | Choose **Maybe**, save | Saved without a key |
| 7 | Choose **Attending** + `DDMMYYYY` | Saved, merge plays, pass appears |
| 8 | Repeat with the dot and hyphen forms | Also accepted |
| 9 | **Attending** + mixed separators | Rejected; previous response intact |
| 10 | **Attending** + wrong / empty password | Rejected; no new pass; input preserved |
| 11 | Refresh after a successful attending | Invitation + pass shown without a password |
| 12 | Change **Attending** → **Can't make it** | No password needed; pass disappears |
| 13 | Switch back to **Attending** | Password required again |
| 14 | Six wrong passwords in a row | HTTP 429 with a retry message |
| 15 | Disable a link, reopen it | `/access-denied` |
| 16 | Regenerate a link, open the old one | `/access-denied`; new link works; RSVP preserved |
| 17 | Let the deadline pass, try to save | Rejected by the server with a clear reason |
| 18 | Click save rapidly | No duplicate RSVP, no extra slot |
| 19 | Go offline, then save | No false success; input preserved |
| 20 | Change the device time zone | Dates still follow the event time zone |
| 21 | Mobile 375 px, keyboard, reduced motion | All core features still usable |

Direct endpoint bypass tests (replace `<TOKEN>` and the origin):

```bash
# attending without a password -> must be rejected
curl -i -X POST http://localhost:3000/api/rsvp \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:3000' \
  -d '{"token":"<TOKEN>","status":"attending"}'

# forbidden fields -> must be rejected
curl -i -X POST http://localhost:3000/api/rsvp \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:3000' \
  -d '{"token":"<TOKEN>","status":"attending","guest_count":5,"password":"DDMMYYYY"}'
```

---

## 11. Deploying to Vercel

1. Push the repo to GitHub/GitLab.
2. In Vercel: **Add New → Project**, pick the repo. Next.js is detected automatically.
3. Add the environment variables (Production **and** Preview):
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `INVITE_PASSWORD_HASH`
   - `SITE_URL` = `https://<project>.vercel.app`
4. Deploy, then **update `SITE_URL`** to the final domain and redeploy so invitation links point at
   the right domain.
5. For Preview deployments, add the preview URL to `ADDITIONAL_ALLOWED_ORIGINS` if needed.

A free `*.vercel.app` subdomain is enough; no need to buy a domain. Subdomain availability and free
plan quotas follow the provider's own terms.

### Supabase Site URL / redirect URLs

**Authentication → URL Configuration**:

- *Site URL*: `https://<project>.vercel.app`
- *Redirect URLs*: add `https://<project>.vercel.app/**` and `http://localhost:3000/**`

### A note on hosting logs

Review URL redaction in your platform logs before going live. This application never logs tokens,
full invitation URLs, passwords, or secrets — but hosting **access logs** usually record request
paths, and an invitation path contains the token. Restrict access to those logs.

---

## 12. Project structure

```
app/
  page.tsx                     public landing (no private data)
  invite/[token]/page.tsx      personal invitation, server validated
  access-denied/page.tsx       neutral message for every link failure
  demo/page.tsx                visual demo, fictional data, writes nothing
  admin/                       redirect, sign-in, dashboard
  api/rsvp/route.ts            the only path that saves an RSVP
  api/admin/...                admin endpoints, each guarded again
components/
  invite/                      boot, hero, event card, PR panel, form, pass, terminal
  admin/                       sign-in, dashboard, guest table, event settings, copy
  ui/                          primitives + setup notice
lib/
  password-format.ts           key normalisation (client-safe)
  password.ts                  hash verification (server)
  origin.ts                    CSRF origin decision (pure, unit tested)
  tokens.ts  invitations.ts  admin-data.ts  auth.ts  admin-guard.ts
  rate-limit.ts  datetime.ts  validation.ts  env.ts  http.ts
supabase/migrations/           0001 init · 0002 seed · 0003 allowlist example
scripts/hash-password.mjs      sets up INVITE_PASSWORD_HASH (hidden input)
tests/                         unit tests for the critical rules
docs/                          PRD.md · VERIFICATION.md
```

---

## 13. Troubleshooting

| Symptom | Cause & fix |
|---|---|
| Page shows "Supabase configuration required" | Supabase env values incomplete. Fill all three in `.env.local` and restart the dev server. |
| HTTP 403 "unrecognized origin" when saving | The request came cross-site, or the browser sent no `Sec-Fetch-Site`. For old browsers, match `SITE_URL` to the origin in use or add it to `ADDITIONAL_ALLOWED_ORIGINS`. |
| "The event key is not set on the server" (503) | `INVITE_PASSWORD_HASH` is empty or invalid. Run `npm run hash-password`. |
| The correct key is still rejected | The hash was generated from a different date, or separators were mixed. Regenerate and check the format. |
| Admin sign-in always fails | The account is not in `admin_users`. Run the allowlist SQL in section 6. |
| "No event data yet" on the dashboard | `0002_seed.sql` has not been run. |
| Constant HTTP 429 | The limiter fails closed because the RPC is unreachable. Confirm `0001_init.sql` ran and `SUPABASE_SERVICE_ROLE_KEY` is correct. |
| An old invitation link stopped working | It was probably rotated or disabled. That is correct behaviour; send the new link. |
| Link cannot be copied | Clipboard is unavailable in that context. The text is pre-selected — copy it manually. |
| Event times look shifted | The dashboard reads input in the **event time zone**. Check the time zone field. |
| `permission denied for function submit_rsvp` | You called the RPC with an anon/authenticated key. It is deliberately restricted to `service_role`. |
| Changed env on Vercel but nothing happened | Environment changes only apply to new deployments. Redeploy. |

---

## 14. Out of scope

CSV import / bulk invites, the WhatsApp API, email blasts, payments, guest sign-up, +1, a
multi-event UI, QR check-in, guest identity/OTP verification, native apps, and paid domains. There is
no GitHub API integration — the Pull Request look is purely a visual metaphor.
