# BIRTHDAY://PROTOCOL

Aplikasi undangan ulang tahun personal bertema cyberpunk neon ungu/cyan, mobile-first, dengan
bahasa visual GitHub Pull Request. Setiap tamu mendapat link unik, membuka undangan tanpa login,
dan menjawab RSVP untuk tepat satu orang tanpa +1. Penyelenggara mengelola tamu satu per satu dari
dashboard admin.

Spesifikasi lengkap ada di [docs/PRD.md](docs/PRD.md). Hasil pengujian yang benar-benar dijalankan
dan batasannya ada di [docs/VERIFICATION.md](docs/VERIFICATION.md).

---

## 1. Prasyarat

| Kebutuhan | Versi |
|---|---|
| Node.js | 20.9 atau lebih baru (dikembangkan pada Node 26) |
| npm | 10 atau lebih baru |
| Akun Supabase | paket gratis sudah cukup |
| Akun Vercel | hanya bila ingin deploy |

Package manager proyek ini adalah **npm**, dan `package-lock.json` ikut di-commit. Semua dependensi
dipin ke versi tepat (bukan `latest`) supaya build dapat direproduksi.

---

## 2. Instalasi lokal

```bash
npm install
cp .env.example .env.local
```

Lalu isi `.env.local` mengikuti bagian berikut. Tanpa konfigurasi Supabase, aplikasi tetap bisa
dijalankan: halaman menampilkan pesan setup yang jujur, dan `/demo` tetap bisa dibuka. Login dan
penyimpanan RSVP **tidak** dipalsukan.

```bash
npm run dev        # http://localhost:3000
```

Perintah lain:

```bash
npm run typecheck      # TypeScript strict, tanpa emit
npm test               # unit test (node:test + tsx)
npm run build          # production build
npm run start          # jalankan hasil build
npm run hash-password  # buat INVITE_PASSWORD_HASH
```

---

## 3. Environment variables

| Nama | Scope | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser | URL proyek Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | browser | publishable/anon key; dibatasi RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | **server saja** | melewati RLS; jangan pernah diberi prefix `NEXT_PUBLIC` |
| `NEXT_PUBLIC_SITE_URL` | browser | basis link undangan **dan** allowlist origin untuk proteksi CSRF |
| `INVITE_PASSWORD_HASH` | **server saja** | SHA-256 kunci "ikut acara" |
| `ADDITIONAL_ALLOWED_ORIGINS` | server, opsional | origin tambahan yang boleh mengirim mutasi, dipisah koma |
| `TRUSTED_IP_HEADER` | server, opsional | hanya bila di-host di belakang proxy selain Vercel |

> `NEXT_PUBLIC_SITE_URL` wajib cocok dengan origin yang benar-benar dipakai. Bila tidak cocok,
> semua request mutasi akan ditolak dengan HTTP 403 "origin tidak dikenal" — ini memang perilaku
> yang diinginkan.

### Membuat `INVITE_PASSWORD_HASH`

```bash
npm run hash-password
# Masukkan tanggal lahir (DD.MM.YYYY atau DD-MM-YYYY): [input tidak muncul di layar]
# INVITE_PASSWORD_HASH=<64 karakter hex>
```

Skrip membaca input **tersembunyi** dari terminal, atau dari stdin bila dipipa
(`printf '...' | npm run hash-password --silent`). Skrip **menolak** password sebagai argumen shell,
karena argumen tersimpan di riwayat shell dan terlihat di daftar proses. Yang dicetak hanya hash-nya.

Salin baris hasilnya ke `.env.local`, dan ke Environment Variables Vercel sebagai variabel server.

---

## 4. Membuat proyek Supabase

1. Buat proyek baru di [supabase.com/dashboard](https://supabase.com/dashboard).
2. Buka **Project Settings → API**, lalu salin:
   - *Project URL* → `NEXT_PUBLIC_SUPABASE_URL`
   - *publishable* / *anon* key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - *service_role* / *secret* key → `SUPABASE_SERVICE_ROLE_KEY`

---

## 5. Menjalankan migration

Buka **SQL Editor** di dashboard Supabase dan jalankan berurutan:

1. `supabase/migrations/0001_init.sql` — tabel, constraint, index, RLS + policy, RPC, grant/revoke.
2. `supabase/migrations/0002_seed.sql` — satu baris acara berisi **placeholder**. Tanggal dan batas
   RSVP sengaja `NULL`; tidak ada tanggal atau lokasi yang dikarang. Idempoten.

Kalau memakai Supabase CLI:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

> Kedua file sudah diuji dijalankan pada PostgreSQL 16 nyata, termasuk dijalankan dua kali untuk
> memastikan idempoten. Rinciannya di [docs/VERIFICATION.md](docs/VERIFICATION.md).

### Yang dilakukan migration

- Enum `rsvp_status` (`attending` / `maybe` / `declined`) — nilai lain ditolak database.
- `guests.token_hash` UNIQUE NOT NULL; hanya SHA-256 yang disimpan, **bukan** token mentah.
- `rsvps.guest_id` UNIQUE — satu undangan maksimal satu respons aktif. Tidak ada kolom `guest_count`.
- Constraint `events_deadline_before_start`: batas RSVP tidak boleh sesudah waktu mulai acara.
- RLS aktif **dan** `force row level security` pada semua tabel. `anon` tidak mendapat hak apa pun;
  `authenticated` hanya `SELECT`, dan masih dipersempit policy ke admin ter-allowlist.
- RPC `submit_rsvp` (SECURITY DEFINER) memvalidasi token aktif + deadline **di dalam transaksi
  penulisan** dengan row lock, dan menolak `attending` tanpa flag password terverifikasi.
- RPC `consume_rate_limit` / `reset_rate_limit` / `purge_expired_rate_limits` untuk limiter persisten.
- Semua fungsi sensitif di-`revoke` dari `PUBLIC`/`anon`/`authenticated` dan di-`grant` hanya ke
  `service_role`. (PostgreSQL memberi `EXECUTE` ke `PUBLIC` secara default — ini dicabut eksplisit.)

---

## 6. Membuat akun admin dan allowlist

Tidak ada signup publik, dan tidak ada jalur dari browser untuk menjadikan diri sendiri admin.

1. **Authentication → Users → Add user**. Isi email dan password, centang *Auto Confirm User*.
2. Jalankan `supabase/migrations/0003_admin_allowlist.sql.example` di SQL Editor setelah mengganti
   alamat emailnya:

```sql
insert into public.admin_users (user_id, note)
select id, 'penyelenggara utama'
from auth.users
where email = 'email-admin-kamu@example.com'
on conflict (user_id) do nothing;
```

3. Verifikasi:

```sql
select au.user_id, u.email
from public.admin_users au
join auth.users u on u.id = au.user_id;
```

Akun yang bisa login tetapi **tidak** ada di `admin_users` akan ditolak dengan pesan generik yang
sama seperti password salah.

---

## 7. Alur pemakaian

### Penyelenggara

1. Buka `/admin` → diarahkan ke login atau dashboard sesuai sesi.
2. Isi **Event settings**: judul, penyelenggara, zona waktu, tanggal, lokasi, dress code, deskripsi,
   batas RSVP. Form tanggal menyebut zona waktu yang dipakai.
3. **Buat undangan** per tamu. Link mentah muncul **sekali**, dengan tombol salin.
4. Kirim link ke tamu (manual atau tombol WhatsApp opsional).
5. Pantau ringkasan dan daftar tamu; tersedia pencarian nama, filter status, dan refresh.
6. **Buat ulang link** bila link lama bocor — link lama langsung tidak berlaku, RSVP tetap tersimpan.
   **Nonaktifkan link** untuk menolak akses tanpa menghapus riwayat.

> Database hanya menyimpan hash token, jadi link **tidak dapat ditampilkan ulang**. Satu-satunya
> jalan adalah membuat ulang link, dan itu mematikan link sebelumnya.

### Tamu

1. Buka link personal → nama, detail acara, dan formulir RSVP **langsung tampil tanpa password**.
2. Pilih **Hadir**, **Belum pasti**, atau **Tidak hadir**, plus pesan opsional (maks 500 karakter).
3. Khusus **Hadir**, isi kunci acara (tanggal lahir penyelenggara) lalu simpan.
4. Setelah server mengonfirmasi, animasi merge berjalan dan **digital party pass** muncul.
5. Membuka ulang link menampilkan undangan dan pass tersimpan **tanpa** memasukkan kunci lagi.

---

## 8. Kunci "ikut acara" (password tanggal lahir)

- Undangan dibuka oleh **token personal**, bukan password.
- Password hanya menjadi kunci saat **menyimpan** pilihan `attending`. `maybe` dan `declined` tidak
  memerlukannya.
- Diterima: dua digit hari, dua digit bulan, empat digit tahun, dengan separator titik **atau** tanda
  hubung secara **konsisten** (`DD.MM.YYYY` / `DD-MM-YYYY`), setelah trim spasi luar. Server
  menormalkan ke `YYYY-MM-DD` sebelum membandingkan hash.
- Ditolak: separator campuran, format lain, satu digit, tanggal yang tidak ada di kalender, dan nilai
  salah.
- Verifikasi **sepenuhnya di server**, sebelum penulisan. Token aktif, deadline, password, dan payload
  harus lolos lebih dulu — tidak ada `attending` yang disimpan dulu lalu diperiksa belakangan.
- **Setiap** submit `attending` memerlukan password lagi, termasuk saat mengubah respons atau hanya
  mengubah pesan. Tidak ada sesi unlock, cookie password, atau `INVITE_SESSION_SECRET`.
- Password salah/kosong: respons lama **tidak berubah**, pass baru tidak diterbitkan, error muncul di
  dekat kolom password, dan pilihan serta pesan tetap ada untuk dicoba ulang.
- Mengubah `attending` → `maybe`/`declined` tidak perlu password dan menghilangkan pass aktif. Kembali
  ke `attending` wajib password lagi.

> **Model keamanannya:** tanggal lahir adalah rahasia bersama yang mudah diketahui orang dekat. Ini
> **kunci konfirmasi ikut acara**, bukan verifikasi identitas. Begitu pula link undangan: link adalah
> *bearer credential* — siapa pun yang memegangnya bisa membaca undangan dan mengubah satu RSVP.
> Sistem membatasi satu slot per undangan, bukan menjamin identitas fisik orangnya.

---

## 9. Rate limit

Limiter **persisten** berbasis PostgreSQL (`rate_limits` + RPC `consume_rate_limit`), sehingga tetap
berlaku di Vercel serverless — berbeda dengan limiter in-memory yang tidak memberi perlindungan
terdistribusi.

| Operasi | Ambang awal |
|---|---|
| Pembacaan undangan | 60 / menit / IP |
| Simpan RSVP | 10 / menit / token + 30 / menit / IP |
| Percobaan password `attending` | 5 / 15 menit per (IP, token) + 20 / 15 menit per IP |
| Login admin | 5 / 15 menit / IP |

Rinciannya:

- **Identifier di-hash.** Bucket adalah SHA-256 dari `(nama aturan | IP | token hash)`, jadi tidak ada
  IP mentah atau token yang tersimpan.
- **Perilaku saat limiter gagal.** Percobaan password dan RSVP **fail-closed** (ditolak) — kegagalan
  limiter tidak boleh diam-diam membuka semua akses. Pembacaan undangan **fail-open**, supaya tamu
  tidak terkunci dari membaca undangan karena masalah infrastruktur.
- **Percobaan yang berhasil direset**, sehingga tidak ikut menghabiskan kuota.
- **Sumber IP.** Memakai header platform (`x-vercel-forwarded-for` / `x-forwarded-for`), bukan header
  arbitrer. Di luar Vercel, setel `TRUSTED_IP_HEADER` sesuai proxy.
- **Cleanup.** Jalankan `select public.purge_expired_rate_limits();` secara berkala (pg_cron atau
  scheduled function). Limiter tetap benar tanpa ini; hanya tabelnya yang tumbuh.
- Kunci salah **tidak** memblokir pembacaan undangan maupun pilihan `maybe`/`declined`.

---

## 10. Uji manual

Setelah migration dan admin siap:

| # | Langkah | Hasil yang diharapkan |
|---|---|---|
| 1 | Login admin yang sah | Dashboard terbuka |
| 2 | Login bukan admin / salah password | Pesan generik yang sama |
| 3 | Buka `/admin/dashboard` tanpa login | Diarahkan ke `/admin/login` |
| 4 | Tambah tamu | Link muncul sekali, bisa disalin |
| 5 | Buka link | Nama + detail + form langsung tampil, tanpa password |
| 6 | Pilih **Belum pasti**, simpan | Tersimpan tanpa password |
| 7 | Pilih **Hadir** + `10.11.2004` (format titik) | Tersimpan, merge berjalan, pass muncul |
| 8 | Ulangi dengan format tanda hubung | Juga diterima |
| 9 | **Hadir** + `10.11-2004` (campuran) | Ditolak; respons lama utuh |
| 10 | **Hadir** + password salah / kosong | Ditolak; tidak ada pass baru; isian tetap ada |
| 11 | Refresh link setelah berhasil | Undangan + pass tampil tanpa password |
| 12 | Ubah **Hadir** → **Tidak hadir** | Tidak perlu password; pass hilang |
| 13 | Kembali ke **Hadir** | Password diminta lagi |
| 14 | Salah password 6× berturut-turut | HTTP 429 dengan pesan retry |
| 15 | Nonaktifkan link, buka lagi | `/access-denied` |
| 16 | Buat ulang link, buka link lama | `/access-denied`; link baru berfungsi; RSVP lama tetap ada |
| 17 | Lewati deadline, coba simpan | Ditolak server dengan alasan jelas |
| 18 | Klik simpan berulang cepat | Tidak ada RSVP ganda, tidak ada slot tambahan |
| 19 | Matikan jaringan lalu simpan | Tidak ada sukses palsu; isian tetap ada |
| 20 | Zona waktu perangkat diubah | Tanggal tetap mengikuti zona waktu acara |
| 21 | Mobile 375 px, keyboard, reduced motion | Semua fitur inti tetap bisa dipakai |

Uji bypass endpoint langsung (ganti `<TOKEN>` dan origin):

```bash
# attending tanpa password -> harus ditolak
curl -i -X POST http://localhost:3000/api/rsvp \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:3000' \
  -d '{"token":"<TOKEN>","status":"attending"}'

# field terlarang -> harus ditolak
curl -i -X POST http://localhost:3000/api/rsvp \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:3000' \
  -d '{"token":"<TOKEN>","status":"attending","guest_count":5,"password":"10.11.2004"}'
```

---

## 11. Deploy ke Vercel

1. Push repo ke GitHub/GitLab.
2. Di Vercel: **Add New → Project**, pilih repo. Framework Next.js terdeteksi otomatis.
3. Tambahkan Environment Variables (Production **dan** Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server saja)
   - `INVITE_PASSWORD_HASH` (server saja)
   - `NEXT_PUBLIC_SITE_URL` = `https://<nama-proyek>.vercel.app`
4. Deploy, lalu **perbarui `NEXT_PUBLIC_SITE_URL`** ke domain final dan deploy ulang supaya link
   undangan dan allowlist origin benar.
5. Untuk Preview deployment, tambahkan URL preview ke `ADDITIONAL_ALLOWED_ORIGINS` bila perlu.

Subdomain `*.vercel.app` gratis sudah cukup; tidak perlu membeli domain. Ketersediaan nama subdomain
dan kuota paket gratis mengikuti syarat provider yang berlaku.

### Supabase Site URL / redirect URL

**Authentication → URL Configuration**:

- *Site URL*: `https://<nama-proyek>.vercel.app`
- *Redirect URLs*: tambahkan `https://<nama-proyek>.vercel.app/**` dan `http://localhost:3000/**`

### Catatan logging hosting

Tinjau redaksi URL pada log platform sebelum produksi. Aplikasi ini tidak pernah mencatat token,
URL undangan lengkap, password, atau secret — tetapi **access log** hosting biasanya mencatat path
request, dan path undangan memuat token. Batasi akses ke log tersebut.

---

## 12. Struktur proyek

```
app/
  page.tsx                     landing publik (tanpa data privat)
  invite/[token]/page.tsx      undangan personal, validasi server
  access-denied/page.tsx       pesan netral untuk semua kegagalan link
  demo/page.tsx                demo visual, data fiktif, tanpa tulis data
  admin/                       redirect, login, dashboard
  api/rsvp/route.ts            satu-satunya jalur penyimpanan RSVP
  api/admin/...                endpoint admin, semuanya dijaga ulang
components/
  invite/                      boot, hero, event card, panel PR, form, pass, terminal
  admin/                       login, dashboard, tabel tamu, event settings, copy
  ui/                          primitives + pesan setup
lib/
  password-format.ts           normalisasi kunci (aman untuk client)
  password.ts                  verifikasi hash (server)
  tokens.ts  invitations.ts  admin-data.ts  auth.ts  admin-guard.ts
  rate-limit.ts  datetime.ts  validation.ts  env.ts  http.ts
supabase/migrations/           0001 init · 0002 seed · 0003 contoh allowlist
scripts/hash-password.mjs      setup INVITE_PASSWORD_HASH (input tersembunyi)
tests/                         unit test untuk aturan kritis
docs/                          PRD.md · VERIFICATION.md
```

---

## 13. Troubleshooting

| Gejala | Penyebab & solusi |
|---|---|
| Halaman menampilkan "Konfigurasi Supabase diperlukan" | Env Supabase belum lengkap. Isi ketiga nilainya di `.env.local`, lalu restart dev server. |
| HTTP 403 "origin tidak dikenal" saat menyimpan | `NEXT_PUBLIC_SITE_URL` tidak cocok dengan origin browser. Samakan, atau tambahkan ke `ADDITIONAL_ALLOWED_ORIGINS`. |
| "Kunci acara belum disetel di server" (503) | `INVITE_PASSWORD_HASH` kosong/tidak valid. Jalankan `npm run hash-password`. |
| Kunci yang benar tetap ditolak | Hash dibuat dari tanggal berbeda, atau separator campuran. Buat ulang hash dan perhatikan formatnya. |
| Login admin selalu gagal | Akun belum ada di `admin_users`. Jalankan SQL allowlist di bagian 6. |
| "Data acara belum ada" di dashboard | `0002_seed.sql` belum dijalankan. |
| HTTP 429 terus-menerus | Limiter fail-closed karena RPC tidak terjangkau. Pastikan `0001_init.sql` sudah dijalankan dan `SUPABASE_SERVICE_ROLE_KEY` benar. |
| Link undangan lama tidak berfungsi | Mungkin sudah dirotasi atau dinonaktifkan. Ini perilaku yang benar; kirim link baru. |
| Link tidak bisa disalin | Clipboard tidak tersedia di konteks itu. Teks sudah diseleksi — salin manual. |
| Jam acara terasa bergeser | Dashboard membaca input pada **zona waktu acara**. Pastikan field zona waktu sudah benar. |
| `permission denied for function submit_rsvp` | Memanggil RPC dengan anon/authenticated key. RPC ini sengaja hanya untuk `service_role`. |

---

## 14. Di luar cakupan

Import CSV/bulk invite, WhatsApp API, email blast, pembayaran, signup tamu, +1, UI multi-event,
QR check-in, verifikasi identitas/OTP tamu, aplikasi native, dan domain berbayar. Tidak ada
integrasi GitHub API — Pull Request hanya metafora visual.
