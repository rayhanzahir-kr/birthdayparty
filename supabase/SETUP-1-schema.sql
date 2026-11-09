-- ============================================================
-- SETUP SUPABASE — LANGKAH 1 dari 2
--
-- Paste SELURUH isi file ini ke Supabase SQL Editor, lalu Run.
-- Aman dijalankan berulang kali (idempoten).
--
-- Gabungan dari supabase/migrations/0001_init.sql + 0002_seed.sql
-- ============================================================

-- =============================================================================
-- BIRTHDAY://PROTOCOL — skema awal
--
-- Prinsip keamanan:
--   * RLS aktif pada SEMUA tabel di schema public.
--   * anon dan authenticated non-admin tidak punya akses baca/tulis ke data
--     tamu, RSVP, rate limit, maupun allowlist admin.
--   * Akses aplikasi dilakukan dari modul server memakai service role, SETELAH
--     otorisasi (token undangan valid, atau sesi admin + allowlist).
--   * Fungsi SECURITY DEFINER dicabut dari PUBLIC/anon/authenticated dan hanya
--     diberikan ke service_role.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enum status RSVP. Nilai di luar daftar ini ditolak oleh database.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'rsvp_status') then
    create type public.rsvp_status as enum ('attending', 'maybe', 'declined');
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- Trigger updated_at
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- events
-- -----------------------------------------------------------------------------
create table if not exists public.events (
  id            uuid primary key default gen_random_uuid(),
  title         text        not null check (char_length(btrim(title)) between 1 and 120),
  host_name     text        not null check (char_length(btrim(host_name)) between 1 and 120),
  event_date    timestamptz,
  timezone      text        not null default 'Europe/Berlin'
                            check (char_length(timezone) between 1 and 64),
  location_name text        not null check (char_length(btrim(location_name)) between 1 and 200),
  location_url  text        check (location_url is null or location_url ~* '^https?://'),
  dress_code    text        not null check (char_length(btrim(dress_code)) between 1 and 120),
  description   text        not null default '' check (char_length(description) <= 1200),
  rsvp_deadline timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- Deadline tidak boleh sesudah waktu mulai acara bila keduanya diisi.
  constraint events_deadline_before_start
    check (event_date is null or rsvp_deadline is null or rsvp_deadline <= event_date)
);

drop trigger if exists events_touch_updated_at on public.events;
create trigger events_touch_updated_at
  before update on public.events
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- guests
--
-- token_hash menyimpan SHA-256 hex dari token mentah. Token mentah TIDAK pernah
-- masuk database, jadi link tidak dapat ditampilkan ulang setelah dibuat.
-- -----------------------------------------------------------------------------
create table if not exists public.guests (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 100),
  token_hash text not null check (token_hash ~ '^[0-9a-f]{64}$'),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guests_token_hash_key unique (token_hash)
);

create index if not exists guests_event_id_created_at_idx
  on public.guests (event_id, created_at desc);

drop trigger if exists guests_touch_updated_at on public.guests;
create trigger guests_touch_updated_at
  before update on public.guests
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- rsvps
--
-- UNIQUE pada guest_id menjamin satu undangan = maksimal satu respons aktif.
-- Tidak ada kolom guest_count / +1: kapasitas selalu satu orang.
-- Tamu yang belum menjawab tidak memiliki baris di sini.
-- -----------------------------------------------------------------------------
create table if not exists public.rsvps (
  id           uuid primary key default gen_random_uuid(),
  guest_id     uuid not null references public.guests (id) on delete cascade,
  status       public.rsvp_status not null,
  message      text check (message is null or char_length(message) <= 500),
  responded_at timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint rsvps_guest_id_key unique (guest_id)
);

create index if not exists rsvps_status_idx on public.rsvps (status);

drop trigger if exists rsvps_touch_updated_at on public.rsvps;
create trigger rsvps_touch_updated_at
  before update on public.rsvps
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- admin_users — allowlist admin.
--
-- Diisi lewat SQL oleh operator tepercaya. Tidak ada policy insert/update,
-- sehingga tidak ada jalur dari browser untuk menjadikan diri sendiri admin.
-- -----------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  note       text check (note is null or char_length(note) <= 200),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- rate_limits — limiter persisten (cocok untuk serverless).
--
-- `bucket` adalah SHA-256 dari (nama aturan | IP | token hash), jadi tidak ada
-- IP mentah atau token yang tersimpan di sini.
-- -----------------------------------------------------------------------------
create table if not exists public.rate_limits (
  bucket       text primary key check (bucket ~ '^[0-9a-f]{64}$'),
  count        integer not null default 0 check (count >= 0),
  window_start timestamptz not null default now(),
  expires_at   timestamptz not null
);

create index if not exists rate_limits_expires_at_idx on public.rate_limits (expires_at);

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.events      enable row level security;
alter table public.guests      enable row level security;
alter table public.rsvps       enable row level security;
alter table public.admin_users enable row level security;
alter table public.rate_limits enable row level security;

alter table public.events      force row level security;
alter table public.guests      force row level security;
alter table public.rsvps       force row level security;
alter table public.admin_users force row level security;
alter table public.rate_limits force row level security;

-- Bersihkan policy lama agar migrasi idempoten.
drop policy if exists events_admin_select on public.events;
drop policy if exists guests_admin_select on public.guests;
drop policy if exists rsvps_admin_select  on public.rsvps;
drop policy if exists admin_users_self_select on public.admin_users;

-- Helper: apakah pemanggil saat ini admin yang ter-allowlist?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.admin_users au where au.user_id = auth.uid()
  );
$$;

-- HANYA baca, HANYA untuk admin ter-allowlist. Semua mutasi berjalan lewat
-- modul server (service role) yang sudah mengotorisasi lebih dulu.
create policy events_admin_select on public.events
  for select to authenticated using (public.is_admin());

create policy guests_admin_select on public.guests
  for select to authenticated using (public.is_admin());

create policy rsvps_admin_select on public.rsvps
  for select to authenticated using (public.is_admin());

create policy admin_users_self_select on public.admin_users
  for select to authenticated using (user_id = auth.uid());

-- Tidak ada policy apa pun untuk anon, dan tidak ada policy untuk
-- rate_limits — artinya anon/authenticated tidak bisa membacanya sama sekali.

-- =============================================================================
-- RPC: submit_rsvp
--
-- Validasi + penulisan dalam SATU transaksi dengan row lock pada guest:
--   * token_hash harus ada dan is_active true  -> invalid_token
--   * deadline (bila diisi) belum lewat        -> deadline_passed
--   * status 'attending' wajib p_password_verified -> password_required
-- Lalu upsert atomik berdasarkan guest_id.
--
-- responded_at mencatat respons PERTAMA; updated_at mencatat perubahan terakhir.
-- =============================================================================
create or replace function public.submit_rsvp(
  p_token_hash       text,
  p_status           public.rsvp_status,
  p_message          text,
  p_password_verified boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_guest    public.guests;
  v_deadline timestamptz;
  v_row      public.rsvps;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('code', 'invalid_token');
  end if;

  -- Row lock: rotasi/nonaktifkan link yang berjalan bersamaan harus menunggu,
  -- sehingga keputusan "aktif" tidak bisa basi saat kita menulis.
  select g.* into v_guest
  from public.guests g
  where g.token_hash = p_token_hash
  for update;

  if not found or not v_guest.is_active then
    return jsonb_build_object('code', 'invalid_token');
  end if;

  select e.rsvp_deadline into v_deadline
  from public.events e
  where e.id = v_guest.event_id;

  if v_deadline is not null and now() > v_deadline then
    return jsonb_build_object('code', 'deadline_passed');
  end if;

  -- Kunci "ikut acara" hanya berlaku untuk attending. Tanpa flag terverifikasi
  -- dari server, attending ditolak walaupun UI dilewati.
  if p_status = 'attending' and coalesce(p_password_verified, false) is not true then
    return jsonb_build_object('code', 'password_required');
  end if;

  insert into public.rsvps as r (guest_id, status, message, responded_at, updated_at)
  values (v_guest.id, p_status, nullif(btrim(coalesce(p_message, '')), ''), now(), now())
  on conflict (guest_id) do update
    set status     = excluded.status,
        message    = excluded.message,
        updated_at = now()
  returning r.* into v_row;

  return jsonb_build_object(
    'code', 'ok',
    'status', v_row.status,
    'message', v_row.message,
    'responded_at', v_row.responded_at,
    'updated_at', v_row.updated_at
  );
end;
$$;

-- =============================================================================
-- RPC: consume_rate_limit / reset_rate_limit
--
-- Window tetap (fixed window). Satu UPSERT atomik; bila window sudah lewat,
-- counter direset dalam statement yang sama.
--
-- Memakai clock_timestamp() (waktu nyata), BUKAN now() yang membeku selama satu
-- transaksi. Dengan begitu kedaluwarsa window tetap benar walau beberapa
-- pemeriksaan terjadi dalam satu transaksi.
-- p_increment = 0 berarti hanya memeriksa tanpa menambah.
-- =============================================================================
create or replace function public.consume_rate_limit(
  p_bucket         text,
  p_limit          integer,
  p_window_seconds integer,
  p_increment      integer default 1
)
returns table (current_count integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count   integer;
  v_expires timestamptz;
begin
  if p_bucket is null or p_bucket !~ '^[0-9a-f]{64}$' then
    raise exception 'bucket tidak valid';
  end if;
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'parameter limiter tidak valid';
  end if;

  insert into public.rate_limits (bucket, count, window_start, expires_at)
  values (
    p_bucket,
    greatest(coalesce(p_increment, 1), 0),
    clock_timestamp(),
    clock_timestamp() + make_interval(secs => p_window_seconds)
  )
  on conflict (bucket) do update
    set count = case
                  when public.rate_limits.expires_at <= clock_timestamp()
                    then greatest(coalesce(p_increment, 1), 0)
                  else public.rate_limits.count + greatest(coalesce(p_increment, 1), 0)
                end,
        window_start = case
                         when public.rate_limits.expires_at <= clock_timestamp() then clock_timestamp()
                         else public.rate_limits.window_start
                       end,
        expires_at = case
                       when public.rate_limits.expires_at <= clock_timestamp()
                         then clock_timestamp() + make_interval(secs => p_window_seconds)
                       else public.rate_limits.expires_at
                     end
  returning public.rate_limits.count, public.rate_limits.expires_at
  into v_count, v_expires;

  return query
    select v_count,
           greatest(1, ceil(extract(epoch from (v_expires - clock_timestamp())))::integer);
end;
$$;

create or replace function public.reset_rate_limit(p_bucket text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_bucket is null or p_bucket !~ '^[0-9a-f]{64}$' then
    return;
  end if;
  delete from public.rate_limits where bucket = p_bucket;
end;
$$;

-- Cleanup bucket kedaluwarsa. Jalankan berkala (pg_cron / Supabase scheduled
-- function); limiter tetap benar tanpa ini, tabelnya saja yang tumbuh.
create or replace function public.purge_expired_rate_limits()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted integer;
begin
  delete from public.rate_limits where expires_at <= now() - interval '1 hour';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- =============================================================================
-- GRANT / REVOKE
--
-- Default PostgreSQL memberikan EXECUTE ke PUBLIC untuk fungsi baru. Itu dicabut
-- di sini supaya anon/authenticated tidak dapat memanggil fungsi sensitif.
-- =============================================================================
revoke all on function public.submit_rsvp(text, public.rsvp_status, text, boolean) from public, anon, authenticated;
revoke all on function public.consume_rate_limit(text, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.reset_rate_limit(text) from public, anon, authenticated;
revoke all on function public.purge_expired_rate_limits() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;

grant execute on function public.submit_rsvp(text, public.rsvp_status, text, boolean) to service_role;
grant execute on function public.consume_rate_limit(text, integer, integer, integer) to service_role;
grant execute on function public.reset_rate_limit(text) to service_role;
grant execute on function public.purge_expired_rate_limits() to service_role;

-- is_admin() dipakai di dalam policy, jadi authenticated perlu memanggilnya.
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- Hak tabel: anon tidak mendapat apa pun. authenticated hanya SELECT, dan RLS
-- masih mempersempitnya ke admin ter-allowlist.
revoke all on all tables in schema public from anon;
revoke all on public.rate_limits from anon, authenticated;
revoke all on public.admin_users from anon;

grant select on public.events      to authenticated;
grant select on public.guests      to authenticated;
grant select on public.rsvps       to authenticated;
grant select on public.admin_users to authenticated;


-- =============================================================================
-- Seed placeholder untuk satu acara.
--
-- Tidak ada tanggal atau lokasi yang dikarang: event_date dan rsvp_deadline
-- sengaja NULL, dan teks lain memakai placeholder dalam tanda siku yang jelas
-- perlu diganti penyelenggara lewat /admin/dashboard -> Event settings.
-- Idempoten: hanya menyisipkan bila tabel events masih kosong.
-- =============================================================================
insert into public.events (
  title, host_name, event_date, timezone, location_name,
  location_url, dress_code, description, rsvp_deadline
)
select
  'Birthday Protocol',
  '[Nama penyelenggara]',
  null,
  'Europe/Berlin',
  '[Lokasi acara]',
  null,
  '[Dress code]',
  'Detail misi akan segera diumumkan.',
  null
where not exists (select 1 from public.events);
