# Verification notes

Date: 9 November 2026 · Node 26.4.0 · npm 11.17.0 · Next.js 15.5.28

This document separates **what was actually executed** from **what was not tested**. Nothing that
requires real Supabase credentials is claimed to pass.

---

## 1. What was run, and the results

### Static checks

| Command | Result |
|---|---|
| `npm run typecheck` (`tsc --noEmit`, strict + `noUncheckedIndexedAccess`) | **Pass, 0 errors** |
| `npm test` (node:test + tsx) | **Pass, 86/86 tests** |
| `npm run build` (production, **with no secrets set**) | **Success**, 16 routes compiled |

The production build succeeds with an empty environment. Misconfiguration surfaces as a clear
runtime message, not a build failure.

### Unit test coverage (86 tests)

- **Tokens** — 32 bytes of entropy, 43-character base64url with no padding, 2000 tokens without a
  collision, SHA-256 matching the standard implementation, hashes that do not contain the token,
  rejection of malformed shapes, and `"demo"` rejected as a token.
- **Key to join** — all three formats (`DDMMYYYY`, `DD.MM.YYYY`, `DD-MM-YYYY`) normalise to the
  same canonical value, so an existing `INVITE_PASSWORD_HASH` keeps working;
  outer whitespace trimmed; mixed separators rejected; other formats rejected; impossible dates
  (`31.02`, `29.02.2003`, `00.11`, month 13) rejected; valid leap days accepted; non-string and
  oversized input rejected; `not_configured` when the hash is missing or malformed; hash comparison
  tolerant of case and surrounding whitespace.
- **Deadline & time zones** — inclusive boundary exactly at the deadline; deadline ≤ start
  consistency; formatting renders the time in the **event** zone (Berlin 19:00 vs Jakarta 01:00 for
  the same instant); the zone name is always included; a placeholder is used instead of an invented
  date; `datetime-local` ↔ ISO conversion including Berlin summer/winter DST; round-trip with no
  drift.
- **Payload validation** — the three valid statuses accepted, fake ones rejected; `.strict()`
  rejects `guest_count`, `plus_one`, `+1`, `guest_id`, `name`, `event_id`, `password_verified`,
  `is_active`; 500-character message limit; guest names 1–100 after trimming; `sanitizeExternalUrl`
  rejects `javascript:`, `data:`, `vbscript:`, `file:`, `ftp:`, protocol-relative URLs, and very long
  URLs.
- **CSRF origin policy** (16 tests) — `cross-site` and `same-site` rejected even when `Origin` is
  forged; unlisted `Origin` and `Referer` rejected; requests with no signal rejected; unparseable
  `Referer` rejected. Accepted: `Sec-Fetch-Site: same-origin` (including when the allowlist is empty
  or misconfigured), Vercel preview deployments, allowlisted origins, localhost, and
  `Sec-Fetch-Site: none` for direct navigation.

### Smoke tests against the production server (`npm run start`)

Run without real Supabase credentials. Everything below was observed directly.

**Routing and status**

| Request | Result |
|---|---|
| `/`, `/access-denied`, `/demo`, `/admin/login` | 200 |
| `/admin` with no session | 307 → `/admin/login` |
| `/invite/short` (malformed token) | 307 → `/access-denied`, no database query |
| `GET /api/rsvp` | 405 |

**Security headers on `/invite/...`** — confirmed sent: `Cache-Control: private, no-store,
max-age=0, must-revalidate`, `X-Robots-Tag: noindex, nofollow, noarchive`,
`Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`.

**Origin / CSRF protection**

| Request | Result |
|---|---|
| POST with no `Origin` header | 403 |
| POST with `Origin: https://evil.example` | 403 |
| POST from an allowlisted origin | passed to the next gate |

**Payload rejection** (allowlisted origin, fake Supabase config so validation is reached)

| Payload | Result |
|---|---|
| `guest_count: 5` | 400 "This request contains fields that are not allowed." |
| `plus_one: true` | 400 |
| injected `guest_id` | 400 |
| injected `name` | 400 |
| `status: "going"` | 400 "Unknown answer option." |
| 600-character message | 400 "Message can be at most 500 characters." |
| body > 8 KB | 400 "Payload too large." |
| `Content-Type: text/plain` | 400 |
| `token: "short"` | 404 `invalid_token` |
| **`token: "demo"` + correct password** | **404 `invalid_token` — demo cannot be used as a bypass** |

**Admin authorization** — `GET /api/admin/guests`, `PUT /api/admin/event`, and
`POST /api/admin/guests/:id/rotate` without a session were all rejected (403 origin, then 403/503 at
the authorization gate). No data was returned.

**Limiter fails closed** — with Supabase unreachable the limiter RPC fails and an `attending`
request is **rejected with 429**, not allowed through. Confirmed the limiter does not fail open.

**Configuration gate** — without Supabase, every mutation endpoint returns 503 with a setup message
and pages render the setup panel. No sign-in or save is ever faked.

### Secret leakage audit (over `.next/static`)

Zero matches for: `2004-11-10`, `10.11.2004`, `10-11-2004`, `INVITE_PASSWORD_HASH`, `SERVICE_ROLE`,
`service_role`, `hashCanonicalPassword`, `token_hash`, `consume_rate_limit`, `submit_rsvp`,
`supabase.co`, `sb_publishable`, `sb_secret`, `SUPABASE_URL`, `SITE_URL`.

**Build-time barriers were actively tested:** importing `lib/password.ts` from a client component
(`RsvpForm`) was attempted on purpose, and the build **failed**
(`UnhandledSchemeError: node:crypto`). The same was tested for the `server-only` marker on other
server modules — the build also failed with *"You're importing a component that needs server-only"*.
Both barriers are real, not just convention.

**Application log audit:** server logs were inspected after the full smoke test. Zero matches for
tokens, both password formats, the hash, and the service key. Only rule names and error codes are
recorded, e.g. `[birthday-protocol] rate_limit_rpc_error rule=rsvp_token code=`.

---

## 2. Migrations & database rules — tested against real PostgreSQL

Run on **PostgreSQL 16** (Docker container) with a small shim reproducing the parts of Supabase the
migrations rely on: the `anon` / `authenticated` / `service_role` roles, the `auth` schema, the
`auth.users` table, and the `auth.uid()` function. The test instance was deleted afterwards.

### Migrations

- `0001_init.sql` and `0002_seed.sql` **ran without errors**.
- **Idempotent:** both were run twice; the `events` table still contained exactly 1 row.
- The seed contains placeholders with `event_date = NULL` and `rsvp_deadline = NULL` — no invented
  date or location.

### RPC `submit_rsvp` (15 cases, all as expected)

| Case | Result |
|---|---|
| `attending` without the password flag | `password_required`, **0 rows** written |
| `maybe` without a password | `ok` |
| `attending` with the flag | `ok` |
| Three submissions in a row | still **1 row** (upsert, not duplicated) |
| `responded_at` vs `updated_at` | first response preserved, change recorded |
| Unknown / malformed token | `invalid_token` |
| Link disabled | `invalid_token`, and the **existing RSVP stayed intact and unchanged** |
| Deadline passed | `deadline_passed`, including for `attending` with the flag set to `true` |
| Token rotated | old token `invalid_token`, new token `ok`, existing RSVP preserved |
| Fake status (`going`) | rejected by the database enum |
| 501-character message | rejected by a check constraint |
| Deadline after the start time | rejected by `events_deadline_before_start` |
| Second RSVP for the same guest | rejected by `unique_violation` |
| `location_url = javascript:alert(1)` | rejected by a check constraint |

### RLS and grants — verified

**`anon`:** `SELECT` denied (`permission denied`) on `guests`, `rsvps`, `events`, `admin_users`, and
`rate_limits`. Calls to `submit_rsvp`, `consume_rate_limit`, `reset_rate_limit`, and
`purge_expired_rate_limits` were **all denied**. `INSERT` into `guests` denied, and attempting to
insert into `admin_users` denied.

**`authenticated` non-admin:** `SELECT` returned **0 rows** for `guests`, `rsvps`, `events`, and
`admin_users` (RLS working). Self-admin attempt denied, `submit_rsvp` denied, `UPDATE events`
denied.

**`authenticated` allowlisted admin:** able to read `guests`, `rsvps`, and `events`; **unable** to
write directly (all mutations intentionally go through server modules); **unable** to read
`rate_limits`.

### Rate limiter — verified

With a limit of 5: attempts 1–5 allowed, attempts 6–7 over the limit (the app returns 429).
`reset_rate_limit` clears the counter. An expired window resets the counter to 1. A `peek`
(increment 0) does not raise the counter. Non-hex buckets and `limit = 0` are rejected. Every
`rate_limits` row matches `^[0-9a-f]{64}$` — **no raw IP or token is stored**.
`purge_expired_rate_limits()` removes expired buckets.

### Concurrency — verified

| Test | Result |
|---|---|
| **20 parallel `submit_rsvp`** calls for the same guest | all `ok`, producing exactly **1 row** and 1 distinct guest — no duplicate RSVP and no extra slot |
| **Token rotation concurrent** with 6 parallel submissions | at most 1 row; no data corruption |
| **Link disabled concurrent** with 8 parallel `attending` submissions | **8/8 `invalid_token`, 0 rows written** — the `FOR UPDATE` row lock prevents writes that should be rejected |

### Findings uncovered during testing

1. **`safeCompareHex` treated two equal-length non-hex strings as identical.**
   `Buffer.from(x, "hex")` stops at the first invalid character and can produce an empty buffer, so
   `timingSafeEqual` compared two empty buffers and returned `true`. Found by a unit test. Fixed by
   validating the hex shape and buffer length before comparing. (The password path was already
   protected because the env hash is validated against `^[0-9a-f]{64}$`, but the primitive is now
   correct.)
2. **The password module was pulled toward the browser bundle.** `lib/validation.ts` imported a
   constant from `lib/password.ts`, and `validation` is used by client components — so `node:crypto`
   followed into the client and the build failed. Fixed by splitting `lib/password-format.ts`
   (normalisation + labels, client-safe, no crypto) from `lib/password.ts` (hashing + verification,
   server). The split also guarantees the hashing logic can never reach the browser.
3. English Zod validation messages in API responses were translated.
4. **The limiter used `now()`, which is frozen for the duration of a transaction.** Window expiry
   was not detected when two checks happened inside the same transaction. On real requests each RPC
   is its own transaction so the behaviour was already correct (verified separately), but
   `consume_rate_limit` now uses `clock_timestamp()` so it is correct in both situations. Retested:
   window reset works both within and across transactions.
5. **CSRF protection was unnecessarily brittle.** The original check required `Origin` to match
   `SITE_URL`, so a single typo in configuration blocked every mutation with 403 — which happened in
   practice. `Sec-Fetch-Site` is set by the browser and cannot be forged by an attacking site, so
   `same-origin` is now accepted on its own, with the `Origin`/`Referer` allowlist kept as a
   fallback for older browsers. 16 tests cover both the accepted and rejected cases.

---

## 3. Not tested — requires real Supabase credentials

The following is implemented and typechecked but was **not** run against a real Supabase project, so
it is not claimed to pass. Manual steps are in README section 10.

- **Supabase Auth end to end** — real admin sign-in, session cookie refresh, and rejection of an
  account that authenticates but is not allowlisted. (The allowlist logic itself was verified at the
  database level.)
- **The full flow through the UI** — generate → send → open → RSVP → dashboard → rotate/disable.
- **The real password path from a browser** — both formats saving `attending` and issuing a pass; a
  wrong password leaving the previous response untouched. Normalisation, hash verification, and RPC
  rejection are verified; the complete chain over HTTP with a real `INVITE_PASSWORD_HASH` is not.
- **RLS behaviour through PostgREST** — the tests above used PostgreSQL roles directly, not
  Supabase's PostgREST API with real JWTs.
- **Limiter reset after a correct password** on the real HTTP path.

### Not tested — visual inspection

**No browser checks were performed.** No screenshots, no real viewport testing, and no visual
verification of reduced-motion or keyboard navigation. Responsive layout, contrast, ≥44 px touch
targets, and `prefers-reduced-motion` are written per PRD §8 and look correct in the code, but have
**not been observed directly**. Verification at 375 / 768 / 1024 / 1440 px still needs to be done
manually.

---

## 4. Implementation decisions

1. **Route Handlers, not Server Actions.** Chosen consistently for all mutations so that origin
   protection, rate limiting, and payload size limits live in one place that can be exercised with
   `curl`.
2. **Service role + authorization in the application layer.** RLS is enabled and `anon` has no
   access at all. Data access runs from server modules with the service role, **after**
   authorization (a valid invite token, or an admin session + allowlist). The admin `SELECT` policies
   remain as defence in depth should direct client access ever be added.
3. **RSVP validation and write in a single RPC.** `submit_rsvp` re-checks the active token and the
   deadline in the same transaction, with `FOR UPDATE` on the guest row. That is the architectural
   reason: checking in the application and writing separately would leave a race against link
   rotation/disabling.
4. **The password flag is passed to the RPC, not the hash.** The hash lives only in the server
   environment, and the RPC rejects `attending` when the flag is `false` — so a direct endpoint
   bypass still fails at the database layer.
5. **Splitting `password-format` from `password`.** Turns a leak to the client into a build failure
   rather than something a human has to remember.
6. **A PostgreSQL-backed limiter.** No external dependency, and persistent on serverless. Trade-off:
   one database round trip per check, and a fixed (not sliding) window.
7. **Fail-open vs fail-closed decided per operation.** Reading an invitation fails open so guests are
   not locked out; password attempts and RSVPs fail closed so the limiter cannot be disabled by
   breaking it.
8. **The demo lives entirely in the component layer.** `/demo` uses a `demo` prop and never calls
   `/api/rsvp`. No special token is accepted by production endpoints — verified.
9. **A ~1.8 second boot sequence**, skippable by button, click, or Escape, and skipped entirely under
   reduced motion. The invitation content is already rendered underneath.
10. **`window.confirm` for rotate/disable.** Chosen so the "the old link dies" warning cannot be
    dismissed accidentally. A custom dialog would suit the theme better; this is a deliberate choice
    favouring clarity of consequences.
11. **A uniform link-failure message.** `/access-denied` does not distinguish a wrong, disabled, or
    rotated token, so it cannot be used to infer whether a guest exists.
12. **Guest names are normalised** (trimmed, repeated whitespace collapsed) but duplicates are
    **allowed**, because two people can share a name.
13. **Interface language is English**, while in-code comments remain in Indonesian at the owner's
    request. The PRD specifies an Indonesian interface; this was a deliberate later change.

## 5. Known limitations

- An invitation link is a *bearer credential*; the system limits one RSVP slot, not physical
  identity.
- The birthday key is a shared secret that people close to the host can easily know — a confirmation
  key, not identity verification.
- The party pass is not a check-in mechanism and carries no QR code.
- Hosting access logs may record paths containing tokens; the application cannot control that.
  Restrict access to platform logs (README section 11).
- The limiter window is fixed, not sliding, so a burst across a window boundary remains possible.
- The MVP supports one event and one host.
