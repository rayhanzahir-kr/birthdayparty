# Catatan verifikasi

Tanggal: 9 November 2026 · Node 26.4.0 · npm 11.17.0 · Next.js 15.5.28

Dokumen ini memisahkan **yang benar-benar dijalankan** dari **yang belum diuji**. Tidak ada
klaim lulus untuk hal yang memerlukan kredensial Supabase nyata.

---

## 1. Yang dijalankan dan hasilnya

### Pemeriksaan statis

| Perintah | Hasil |
|---|---|
| `npm run typecheck` (`tsc --noEmit`, strict + `noUncheckedIndexedAccess`) | **Lulus, 0 error** |
| `npm test` (node:test + tsx) | **Lulus, 70/70 tes, 19 suite** |
| `npm run build` (production, **tanpa secrets apa pun**) | **Berhasil**, 16 route ter-compile |

Build produksi berhasil tanpa env terisi. Kegagalan konfigurasi muncul sebagai pesan runtime yang
jelas, bukan error build.

### Cakupan unit test (70 tes)

- **Token** — entropi 32 byte, base64url 43 karakter tanpa padding, 2000 token tanpa duplikat,
  SHA-256 cocok dengan implementasi standar, hash tidak memuat token, penolakan bentuk salah,
  dan `"demo"` ditolak sebagai token.
- **Kunci "ikut acara"** — kedua format (`DD.MM.YYYY`, `DD-MM-YYYY`) dinormalkan ke nilai kanonis
  yang sama; trim spasi luar; separator campuran ditolak; format lain ditolak; tanggal tidak valid
  (`31.02`, `29.02.2003`, `00.11`, bulan 13) ditolak; kabisat valid diterima; input non-string dan
  sangat panjang ditolak; `not_configured` ketika hash belum/tidak valid; perbandingan hash
  case-insensitive terhadap whitespace.
- **Deadline & zona waktu** — batas inklusif tepat pada deadline; konsistensi deadline ≤ waktu mulai;
  format menampilkan jam pada **zona acara** (Berlin 19:00 vs Jakarta 01:00 untuk instant yang sama);
  nama zona selalu disertakan; placeholder dipakai alih-alih tanggal karangan; konversi
  `datetime-local` ↔ ISO termasuk DST Berlin musim panas/dingin; round-trip tanpa pergeseran.
- **Validasi payload** — tiga status sah diterima, status palsu ditolak; `.strict()` menolak
  `guest_count`, `plus_one`, `+1`, `guest_id`, `name`, `event_id`, `password_verified`, `is_active`;
  batas pesan 500 karakter; nama tamu 1–100 setelah trim; `sanitizeExternalUrl` menolak
  `javascript:`, `data:`, `vbscript:`, `file:`, `ftp:`, URL protokol-relatif, dan URL sangat panjang.

### Smoke test terhadap server produksi (`npm run start`)

Dijalankan tanpa Supabase nyata. Semua hasil di bawah diamati langsung.

**Routing dan status**

| Request | Hasil |
|---|---|
| `/`, `/access-denied`, `/demo`, `/admin/login` | 200 |
| `/admin` tanpa sesi | 307 → `/admin/login` |
| `/invite/short` (bentuk token salah) | 307 → `/access-denied`, tanpa query database |
| `/api/rsvp` dengan GET | 405 |

**Header keamanan pada `/invite/...`** — terverifikasi terkirim:
`Cache-Control: private, no-store, max-age=0, must-revalidate`,
`X-Robots-Tag: noindex, nofollow, noarchive`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`.

**Proteksi origin / CSRF**

| Request | Hasil |
|---|---|
| POST tanpa header `Origin` | 403 |
| POST dengan `Origin: https://evil.example` | 403 |
| POST dengan origin ter-allowlist | diteruskan ke gerbang berikutnya |

**Penolakan payload** (origin ter-allowlist, Supabase dikonfigurasi palsu sehingga validasi tercapai)

| Payload | Hasil |
|---|---|
| `guest_count: 5` | 400 "Ada data tambahan yang tidak diizinkan…" |
| `plus_one: true` | 400 |
| `guest_id` disuntikkan | 400 |
| `name` disuntikkan | 400 |
| `status: "going"` | 400 "Pilihan jawaban tidak dikenal." |
| pesan 600 karakter | 400 "Pesan maksimal 500 karakter." |
| body > 8 KB | 400 "Payload terlalu besar." |
| `Content-Type: text/plain` | 400 |
| `token: "short"` | 404 `invalid_token` |
| **`token: "demo"` + password benar** | **404 `invalid_token` — demo tidak bisa dipakai sebagai bypass** |

**Otorisasi admin** — `GET /api/admin/guests`, `PUT /api/admin/event`, dan
`POST /api/admin/guests/:id/rotate` tanpa sesi semuanya ditolak (403 origin, lalu 403/503 pada
gerbang otorisasi). Tidak ada data yang dikembalikan.

**Limiter fail-closed** — dengan Supabase tidak terjangkau, RPC limiter gagal dan permintaan
`attending` **ditolak dengan 429**, bukan diteruskan. Terkonfirmasi limiter tidak fail-open.

**Gerbang konfigurasi** — tanpa Supabase, semua endpoint mutasi mengembalikan 503 dengan pesan
setup, dan halaman menampilkan panel setup. Tidak ada login atau penyimpanan yang dipalsukan.

### Audit kebocoran secret (dijalankan atas `.next/static`)

Nol kecocokan untuk: `2004-11-10`, `10.11.2004`, `10-11-2004`, `INVITE_PASSWORD_HASH`,
`SERVICE_ROLE`, `service_role`, `hashCanonicalPassword`, `token_hash`, `consume_rate_limit`,
`submit_rsvp`.

**Penghalang build-time diuji aktif:** mengimpor `lib/password.ts` dari komponen client (`RsvpForm`)
sengaja dicoba, dan build **gagal** (`UnhandledSchemeError: node:crypto`). Hal yang sama diuji untuk
marker `server-only` pada modul server lain — build juga gagal dengan pesan
*"You're importing a component that needs server-only"*. Kedua penghalang nyata, bukan sekadar
konvensi.

**Audit log aplikasi:** log server diperiksa setelah seluruh smoke test. Nol kecocokan untuk token,
kedua format password, hash, dan service key. Yang tercatat hanya nama aturan dan kode error, mis.
`[birthday-protocol] rate_limit_rpc_error rule=rsvp_token code=`.

### Temuan yang diperbaiki selama verifikasi

1. **`safeCompareHex` menganggap string non-hex sama panjang sebagai identik.** `Buffer.from(x, "hex")`
   berhenti pada karakter tidak valid dan dapat menghasilkan buffer kosong, sehingga
   `timingSafeEqual` membandingkan dua buffer kosong dan mengembalikan `true`. Ditemukan oleh unit
   test. Diperbaiki dengan memvalidasi bentuk hex dan panjang buffer sebelum perbandingan. (Jalur
   password sendiri sudah terlindung karena hash env divalidasi `^[0-9a-f]{64}$`, tetapi primitifnya
   kini benar.)
2. **Modul password tertarik ke bundle browser.** `lib/validation.ts` mengimpor konstanta dari
   `lib/password.ts`, dan `validation` dipakai komponen client — sehingga `node:crypto` ikut ke
   client dan build gagal. Diperbaiki dengan memisahkan `lib/password-format.ts` (normalisasi +
   label, aman untuk client, tanpa crypto) dari `lib/password.ts` (hash + verifikasi, server).
   Pemisahan ini sekaligus memastikan logika hash tidak pernah dapat ikut ke browser.
3. Pesan validasi Zod berbahasa Inggris pada respons API diterjemahkan ke Indonesia.

---

## 2. Migration & aturan database — diuji terhadap PostgreSQL nyata

Dijalankan pada **PostgreSQL 16** (container Docker) dengan shim kecil yang meniru bagian Supabase
yang dipakai migration: role `anon` / `authenticated` / `service_role`, schema `auth`, tabel
`auth.users`, dan fungsi `auth.uid()`. Instance uji sudah dihapus setelah pengujian.

### Migration

- `0001_init.sql` dan `0002_seed.sql` **berhasil dijalankan tanpa error**.
- **Idempoten:** keduanya dijalankan dua kali; tabel `events` tetap berisi tepat 1 baris.
- Seed berisi placeholder dengan `event_date = NULL` dan `rsvp_deadline = NULL` — tidak ada tanggal
  atau lokasi karangan.

### RPC `submit_rsvp` (15 kasus, semuanya sesuai harapan)

| Kasus | Hasil |
|---|---|
| `attending` tanpa flag password | `password_required`, **0 baris** rsvps ditulis |
| `maybe` tanpa password | `ok` |
| `attending` dengan flag | `ok` |
| Tiga submit berturut-turut | tetap **1 baris** (upsert, bukan duplikat) |
| `responded_at` vs `updated_at` | respons pertama dipertahankan, perubahan tercatat |
| Token tidak dikenal / bentuk salah | `invalid_token` |
| Link dinonaktifkan | `invalid_token`, dan **RSVP lama tetap utuh & tidak berubah** |
| Deadline lewat | `deadline_passed`, termasuk untuk `attending` dengan flag `true` |
| Rotasi token | token lama `invalid_token`, token baru `ok`, RSVP lama tetap ada |
| Status palsu (`going`) | ditolak enum database |
| Pesan 501 karakter | ditolak check constraint |
| Deadline sesudah waktu mulai | ditolak `events_deadline_before_start` |
| RSVP kedua untuk guest sama | ditolak `unique_violation` |
| `location_url = javascript:alert(1)` | ditolak check constraint |

### RLS dan grant — terverifikasi

**`anon`:** `SELECT` ditolak (`permission denied`) pada `guests`, `rsvps`, `events`, `admin_users`,
dan `rate_limits`. Pemanggilan `submit_rsvp`, `consume_rate_limit`, `reset_rate_limit`, dan
`purge_expired_rate_limits` **semuanya ditolak**. `INSERT` ke `guests` ditolak, dan upaya
memasukkan diri ke `admin_users` ditolak.

**`authenticated` non-admin:** `SELECT` mengembalikan **0 baris** untuk `guests`, `rsvps`, `events`,
dan `admin_users` (RLS bekerja). Upaya self-admin ditolak, `submit_rsvp` ditolak, `UPDATE events`
ditolak.

**`authenticated` admin ter-allowlist:** dapat membaca `guests`, `rsvps`, dan `events`; **tidak**
dapat menulis langsung (semua mutasi memang lewat modul server), dan **tidak** dapat membaca
`rate_limits`.

### Rate limiter — terverifikasi

Limit 5: percobaan 1–5 diizinkan, percobaan 6–7 melewati batas (aplikasi mengembalikan 429).
`reset_rate_limit` mengosongkan counter. Window kedaluwarsa mereset counter ke 1. `peek`
(increment 0) tidak menaikkan counter. Bucket non-hex dan `limit = 0` ditolak. Semua baris
`rate_limits` cocok `^[0-9a-f]{64}$` — **tidak ada IP atau token mentah yang tersimpan**.
`purge_expired_rate_limits()` menghapus bucket kedaluwarsa.

### Konkurensi — terverifikasi

| Uji | Hasil |
|---|---|
| **20 `submit_rsvp` paralel** untuk guest yang sama | semuanya `ok`, menghasilkan tepat **1 baris**, 1 guest unik — tidak ada RSVP ganda dan tidak ada slot tambahan |
| **Rotasi token bersamaan** dengan 6 submit paralel | maksimal 1 baris; tidak ada korupsi data |
| **Nonaktifkan link bersamaan** dengan 8 submit `attending` paralel | **8/8 `invalid_token`, 0 baris ditulis** — row lock `FOR UPDATE` mencegah tulisan yang seharusnya ditolak |

### Temuan selama pengujian database

4. **Limiter memakai `now()`, yang membeku selama satu transaksi.** Awalnya kedaluwarsa window
   tidak terdeteksi bila dua pemeriksaan terjadi dalam transaksi yang sama. Pada request nyata
   setiap RPC adalah transaksi sendiri sehingga perilakunya sudah benar (diverifikasi terpisah),
   tetapi `consume_rate_limit` kini memakai `clock_timestamp()` agar benar dalam kedua situasi.
   Diuji ulang: window reset bekerja di dalam maupun antar transaksi.

---

## 3. Belum diuji — memerlukan kredensial Supabase nyata

Yang berikut diimplementasikan dan di-typecheck, tetapi **tidak** dijalankan terhadap proyek
Supabase sungguhan, sehingga tidak diklaim lulus. Langkah manualnya ada di README bagian 10.

- **Supabase Auth end-to-end** — login admin nyata, penyegaran cookie sesi, dan penolakan akun yang
  terautentikasi tetapi tidak ter-allowlist. (Logika allowlist-nya sendiri sudah terverifikasi di
  tingkat database.)
- **Alur penuh lewat UI** — generate → kirim → buka → RSVP → dashboard → rotate/nonaktifkan.
- **Jalur password nyata dari browser** — kedua format menyimpan `attending` dan menerbitkan pass;
  password salah tidak mengubah respons lama. Normalisasi, verifikasi hash, dan penolakan RPC sudah
  terverifikasi; yang belum adalah rangkaian lengkapnya lewat HTTP dengan `INVITE_PASSWORD_HASH`
  nyata.
- **Perilaku RLS pada PostgREST** — pengujian di atas memakai role PostgreSQL langsung, bukan lewat
  API PostgREST Supabase dengan JWT sungguhan.
- **Reset limiter setelah password benar** pada jalur HTTP nyata.

### Belum diuji — pemeriksaan visual

**Tidak ada pemeriksaan browser yang dijalankan.** Tidak ada screenshot, tidak ada pengujian
viewport nyata, dan tidak ada verifikasi reduced-motion atau navigasi keyboard secara visual.
Layout responsif, kontras, target sentuh ≥44 px, dan `prefers-reduced-motion` ditulis sesuai
PRD §8 dan terlihat benar pada kode, tetapi **belum diamati langsung**. Verifikasi pada 375 / 768 /
1024 / 1440 px masih perlu dilakukan manual.

---

## 4. Keputusan implementasi

1. **Route Handlers, bukan Server Actions.** Dipilih konsisten untuk semua mutasi agar proteksi
   origin, rate limit, dan batas ukuran payload berada di satu tempat yang dapat diuji dengan `curl`.
2. **Service role + otorisasi di lapisan aplikasi.** RLS aktif dan `anon` tidak punya akses apa pun.
   Akses data berjalan dari modul server dengan service role, **setelah** otorisasi (token undangan
   valid, atau sesi admin + allowlist). Policy `SELECT` untuk admin tetap ada sebagai pertahanan
   berlapis bila nanti ada akses langsung dari klien.
3. **Validasi + penulisan RSVP di dalam satu RPC.** `submit_rsvp` memeriksa ulang token aktif dan
   deadline di transaksi yang sama dengan `FOR UPDATE` pada baris guest. Ini alasan arsitekturalnya:
   memeriksa di aplikasi lalu menulis terpisah akan meninggalkan celah perlombaan dengan
   rotasi/nonaktifkan link.
4. **Flag password diteruskan ke RPC, bukan hash-nya.** Hash hanya ada di env server, dan RPC menolak
   `attending` ketika flag `false` — jadi bypass endpoint langsung tetap gagal di lapisan database.
5. **Pemisahan `password-format` / `password`.** Membuat kebocoran ke client menjadi kegagalan build,
   bukan sesuatu yang harus diingat manusia.
6. **Limiter berbasis PostgreSQL.** Tidak ada dependensi eksternal, dan persisten di serverless.
   Trade-off: satu round-trip database per pemeriksaan, dan window tetap (bukan sliding).
7. **Arah fail-open/fail-closed dibedakan per operasi.** Pembacaan undangan fail-open agar tamu tidak
   terkunci; percobaan password dan RSVP fail-closed agar limiter tidak bisa dilumpuhkan.
8. **Demo sepenuhnya di sisi komponen.** `/demo` memakai prop `demo` dan tidak pernah memanggil
   `/api/rsvp`. Tidak ada token spesial yang diterima endpoint produksi — sudah diverifikasi.
9. **Boot sequence ~1,8 detik**, bisa dilewati lewat tombol, klik, atau Escape, dan dilewati
   sepenuhnya saat reduced motion. Konten undangan sudah ter-render di bawahnya.
10. **`window.confirm` untuk rotasi/nonaktifkan.** Dipilih agar peringatan "link lama akan mati" tidak
    bisa dilewati tanpa sadar. Dialog kustom akan lebih sesuai tema; ini keputusan sadar yang
    mengutamakan kejelasan konsekuensi.
11. **Pesan kegagalan link seragam.** `/access-denied` tidak membedakan token salah, nonaktif, dan
    terotasi, supaya tidak bisa dipakai menyimpulkan keberadaan seorang tamu.
12. **Nama tamu dinormalkan** (trim + spasi ganda dirapatkan), tetapi duplikat **diizinkan** karena dua
    orang bisa bernama sama.

## 5. Batasan yang diketahui

- Link undangan adalah *bearer credential*; sistem membatasi satu slot RSVP, bukan identitas fisik.
- Kunci tanggal lahir adalah rahasia bersama yang mudah diketahui orang dekat — kunci konfirmasi,
  bukan verifikasi identitas.
- Party pass bukan alat check-in dan tidak memuat QR.
- Access log hosting dapat mencatat path yang memuat token; aplikasi tidak bisa mengendalikan ini.
  Batasi akses ke log platform (README bagian 11).
- Window limiter bersifat fixed, bukan sliding, sehingga burst di perbatasan window masih mungkin.
- MVP mendukung satu acara dan satu penyelenggara.
