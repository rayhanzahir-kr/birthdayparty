# PRD — BIRTHDAY://PROTOCOL

Versi 1.0 · 9 November 2026 · Status: siap untuk implementasi

## 1. Ringkasan produk
Aplikasi undangan ulang tahun personal dengan tema cyberpunk neon ungu/cyan, pengalaman cinematic mobile-first, dan bahasa visual GitHub Pull Request yang playful. Setiap tamu mendapat link unik, melihat nama dan detail pesta, lalu menjawab RSVP tanpa membuat akun. Penyelenggara mengelola undangan satu per satu melalui dashboard admin.

Tujuan: pengalaman undangan terasa eksklusif, tetapi tetap mudah digunakan tamu yang tidak memahami teknologi. Terminal dan istilah developer tidak boleh menjadi syarat untuk RSVP.

## 2. Pengguna dan kebutuhan
| Pengguna | Kebutuhan utama |
|---|---|
| Penyelenggara/admin | Login aman, tambah tamu, bagikan link, pantau respons, ubah detail acara |
| Tamu | Membuka undangan personal, mengetahui waktu/tempat, memberi atau mengubah jawaban, menampilkan party pass |

MVP mendukung satu acara dan satu penyelenggara. Struktur data tetap memakai event_id agar hubungan data jelas.

## 3. Sasaran keberhasilan
- Admin bisa membuat dan menyalin undangan tanpa mengedit kode.
- Tamu dapat menyelesaikan RSVP dari ponsel tanpa login atau terminal.
- Setiap undangan memiliki tepat satu slot dan paling banyak satu respons aktif.
- Respons yang berhasil tersimpan muncul di dashboard setelah refresh.
- Akses tanpa otorisasi tidak dapat membaca daftar tamu atau mengubah acara.
- Build produksi berhasil; alur dengan Supabase nyata diverifikasi setelah kredensial tersedia.

Tidak mengklaim angka konversi atau pengujian produksi tanpa data nyata.

## 4. Cakupan MVP
### 4.1 Halaman publik
- `/`: landing ringkas dengan identitas Birthday Protocol dan instruksi membuka link personal; jangan menampilkan daftar tamu atau informasi privat acara.
- `/invite/[token]`: undangan personal yang divalidasi server.
- `/access-denied`: pesan netral untuk link salah, nonaktif, atau sudah diganti, tanpa mengungkap keberadaan tamu.
- `/demo`: opsional, memakai data fiktif dan label demo yang jelas; tidak menyimpan RSVP nyata.

### 4.2 Pengalaman undangan
1. Validasi token dan status aktif di server, lalu langsung tampilkan undangan personal tanpa password. Password hanya diperlukan untuk menyimpan pilihan Hadir, sesuai bagian 4.6.
2. Boot sequence maksimal sekitar dua detik, bisa dilewati, tidak menghalangi RSVP, menghormati reduced motion.
3. Sapaan nama tamu dengan identitas visual hologram/scanline yang tetap terbaca.
4. Kartu detail acara: judul, penyelenggara, tanggal, jam dan zona waktu, lokasi, peta opsional, dress code, deskripsi, serta batas RSVP opsional.
5. Panel bergaya Pull Request dengan penjelasan sederhana: “1 undangan · 1 orang · tanpa +1”.
6. Pilihan RSVP: Hadir (`attending`), Belum pasti (`maybe`), Tidak hadir (`declined`). Pesan opsional maksimal 500 karakter.
7. Tombol simpan dengan status loading, sukses, gagal, dan kesempatan mencoba ulang. Pertahankan isian saat jaringan gagal.
8. Animasi merge hanya setelah server mengonfirmasi penyimpanan.
9. Digital party pass tampil hanya bila respons tersimpan adalah attending.

Nama tamu tidak dapat diubah oleh tamu. Tidak ada kolom jumlah orang atau +1. Tamu boleh mengubah respons melalui link yang sama sebelum batas RSVP, jika ditetapkan. Batas yang sudah lewat menutup perubahan di server dan menampilkan alasan yang jelas; pass attending tetap bisa dilihat selama undangan aktif.

### 4.3 Digital party pass
Menampilkan nama tamu, judul acara, tanggal/jam/zona waktu atau placeholder, lokasi, status Hadir, dan kapasitas 1 orang. Kartu dapat ditampilkan langsung dari ponsel. Screenshot merupakan cara penyimpanan MVP; unduh gambar opsional. Jangan menampilkan token atau hash pada kartu.

Pass bukan mekanisme verifikasi identitas atau check-in. QR dan validasi tiket di pintu tidak termasuk MVP.

### 4.4 Terminal opsional
Panel tertutup secara default, dapat dibuka/dimatikan. Perintah lokal yang aman seperti `help`, `whoami`, `mission`, dan `clear`. Tidak menjalankan shell, JavaScript dari input, atau operasi admin. Seluruh tindakan utama tetap tersedia melalui tombol biasa.

### 4.5 Admin
- `/admin` mengarah ke login atau dashboard sesuai sesi.
- `/admin/login`: email/password melalui Supabase Auth, pesan kesalahan generik, dukungan password manager, loading, dan pembatasan percobaan login.
- `/admin/dashboard`: hanya akun yang terautentikasi dan terotorisasi sebagai admin.
- Ringkasan total tamu, belum menjawab, hadir, belum pasti, tidak hadir; bedakan undangan aktif/nonaktif.
- Tambah tamu satu per satu: nama wajib 1–100 karakter setelah trim. Nama sama boleh digunakan untuk orang berbeda.
- Generate token di server, simpan hash, tampilkan link mentah hanya pada hasil pembuatan dengan tombol salin.
- Jika clipboard tidak tersedia, tampilkan input read-only untuk salin manual. Berbagi WhatsApp opsional, hanya atas tindakan admin.
- Link tidak dapat diambil ulang dari hash. Sediakan “Buat ulang link” dengan konfirmasi jelas bahwa link sebelumnya akan tidak berlaku.
- Rotasi token mempertahankan tamu dan RSVP yang sudah ada. Menonaktifkan link juga mempertahankan riwayat RSVP, tetapi menolak akses dan perubahan dari link tersebut.
- Daftar tamu berisi nama, status RSVP, status undangan, waktu respons, pesan, serta tindakan rotasi/nonaktifkan. Pencarian nama dan filter status, empty state, error state, serta refresh tersedia.
- Event settings mengubah detail acara tanpa mengedit kode. Ada validasi, notifikasi sukses/gagal, dan logout.
- Akun admin dibuat lewat Supabase; tidak ada signup publik atau cara menjadikan diri sendiri admin dari browser.

### 4.6 Password sebagai kunci ikut acara
- Link personal yang valid langsung membuka sapaan nama, detail acara, dan formulir RSVP tanpa password.
- Saat tamu memilih **Hadir** (`attending`), tampilkan kolom password sebagai kunci konfirmasi ikut acara. Pilihan **Belum pasti** (`maybe`) dan **Tidak hadir** (`declined`) tidak memerlukan password.
- Password yang ditentukan penyelenggara: `10.11.2004` atau `10-11-2004`; keduanya mewakili tanggal 10 November 2004 dan harus diterima.
- Label: “Kunci untuk ikut: tanggal lahirku”; petunjuk: `DD.MM.YYYY atau DD-MM-YYYY`. Jangan menampilkan jawaban atau mengisi password otomatis. Gunakan input password dengan tombol tampilkan/sembunyikan opsional, bukan input date.
- Trim spasi di awal/akhir, terima pola dua digit hari, dua digit bulan, empat digit tahun dengan separator titik atau tanda hubung yang konsisten, lalu normalisasi ke `YYYY-MM-DD`. Tolak separator campuran, format lain, tanggal tidak valid, dan nilai salah.
- Validasi password sepenuhnya di server dalam operasi penyimpanan RSVP attending. Token aktif, deadline, password, dan payload harus lolos sebelum write. Jangan menyimpan attending terlebih dahulu lalu memeriksa password belakangan.
- Simpan hash nilai kanonis dalam environment server-only `INVITE_PASSWORD_HASH`. Jangan menanamkan password literal dalam source aplikasi, NEXT_PUBLIC, HTML, bundle browser, respons API, atau log. Dokumen operator ini memuat nilai yang diminta pengguna dan tidak boleh disajikan sebagai aset web publik.
- Setiap submit attending memerlukan password, termasuk ketika mengubah respons sebelumnya atau menyimpan perubahan pesan dengan status attending. Tidak diperlukan sesi unlock, cookie password, atau INVITE_SESSION_SECRET.
- Jika password salah/kosong, jangan mengubah respons yang tersimpan dan jangan menerbitkan pass baru. Tampilkan error dekat kolom password; pertahankan pilihan dan pesan agar bisa dicoba ulang. Kosongkan password setelah berhasil.
- Setelah attending berhasil tersimpan, tampilkan digital party pass. Saat link dibuka ulang, undangan dan pass dari status attending yang sudah tersimpan dapat dilihat tanpa memasukkan password lagi. Status maybe/declined tidak menampilkan pass aktif.
- Mengubah attending menjadi maybe/declined tidak memerlukan password dan menghilangkan pass aktif. Kembali memilih attending memerlukan password lagi.
- Semua pembacaan undangan dan mutasi tetap memvalidasi token aktif; rotasi/nonaktifkan link tetap berlaku. Password bukan pengganti token personal dan bukan password admin.
- Percobaan password attending mendapat rate limit persisten: awal 5 kegagalan per 15 menit per pasangan IP tepercaya dan hash token, ditambah batas agregat IP. Berikan pesan retry yang jelas. Jangan memblokir pembacaan undangan atau pilihan maybe/declined hanya karena password salah; rate limit umum tetap berlaku.
- Tanggal lahir adalah rahasia bersama yang mudah diketahui. Fitur ini merupakan kunci konfirmasi ikut acara, bukan verifikasi identitas fisik.

## 5. Detail acara dan placeholder
Jangan mengarang tanggal atau lokasi yang terlihat final. Seed awal:
- Judul: Birthday Protocol
- Penyelenggara: [Nama penyelenggara]
- Tanggal dan jam: belum ditentukan (`null`)
- Zona waktu: Europe/Berlin, dapat diubah admin
- Lokasi: [Lokasi acara]
- URL peta: kosong
- Dress code: [Dress code]
- Deskripsi: Detail misi akan segera diumumkan.
- Batas RSVP: tidak ditetapkan (`null`)

Simpan timestamp sebagai timestamptz; tampilkan dengan zona waktu acara, bukan zona waktu perangkat. Form tanggal admin harus menjelaskan zona waktu yang digunakan. Tolak deadline yang sesudah waktu mulai acara bila keduanya diisi. URL eksternal hanya menerima https/http, tanpa javascript/data URL.

## 6. Model data
| Tabel | Kolom utama dan aturan |
|---|---|
| events | id UUID PK, title, host_name, event_date nullable, timezone, location_name, location_url nullable, dress_code, description, rsvp_deadline nullable, created_at, updated_at |
| guests | id UUID PK, event_id FK, name, token_hash UNIQUE NOT NULL, is_active default true, created_at, updated_at |
| rsvps | id UUID PK, guest_id FK UNIQUE, status enum attending/maybe/declined, message nullable, responded_at, updated_at |
| admin_users | user_id UUID PK/FK auth.users; diisi lewat SQL/operator tepercaya, tidak dapat ditulis pengguna biasa |
| rate_limits | Opsional bila limiter persisten memakai PostgreSQL: bucket identifier hash, window, count, expiry |

Tamu yang belum menjawab tidak memiliki baris rsvps. Tidak ada guest_count. Update RSVP memakai upsert atomik berdasarkan guest_id; responded_at mencatat respons pertama, updated_at mencatat perubahan terakhir. Validasi aktif/deadline dan penulisan RSVP harus konsisten saat ada request bersamaan atau rotasi/nonaktifkan link.

## 7. Keamanan dan privasi
- Token dibuat dengan cryptographic RNG minimal 128-bit; rekomendasi 32 byte base64url.
- Database hanya menyimpan SHA-256 token, bukan token mentah. Token berentropi tinggi tidak memerlukan password hashing yang mahal.
- Jangan mencatat token, URL undangan lengkap, password, service key, atau payload pribadi ke log aplikasi/analytics. Tinjau redaksi URL pada logging hosting sebelum produksi.
- Link merupakan bearer credential: siapa pun yang memiliki link dapat membaca undangan dan mengubah satu RSVP. Sistem membatasi slot, bukan menjamin identitas fisik.
- Service-role/secret key hanya di modul server; tidak memakai prefix NEXT_PUBLIC dan tidak dikirim ke browser.
- Aktifkan RLS pada semua tabel di schema publik. Anon tidak memiliki akses langsung ke data tamu/RSVP/settings privat. Pengguna authenticated non-admin juga ditolak.
- Setiap operasi admin memverifikasi sesi Supabase di server dan memeriksa allowlist admin. Jangan mengandalkan menyembunyikan UI atau middleware saja.
- Operasi publik hanya mengembalikan field undangan yang diperlukan setelah validasi token. Jangan mengembalikan hash atau daftar tamu.
- Validasi server dengan Zod dan constraint database; batasi ukuran payload serta panjang nama/pesan/setting.
- Request mutasi memakai POST, proteksi origin/CSRF yang sesuai arsitektur, dan cookie sesi aman. Jangan mengandalkan CORS sebagai perlindungan CSRF.
- Rate limit untuk lookup token, RSVP, dan login. Gunakan penyimpanan persisten/distribusi bila tersedia; limiter in-memory hanya fallback yang keterbatasannya harus ditulis jelas untuk Vercel serverless. Kegagalan limiter tidak boleh diam-diam membuka semua akses.
- Ambang awal yang dapat disetel: lookup 60/menit/IP, RSVP 10/menit/token + 30/menit/IP, login 5/15 menit/IP. Gunakan sumber IP tepercaya dari platform, bukan header arbitrer tanpa konfigurasi.
- Undangan/admin tidak di-cache publik: gunakan rendering dinamis serta Cache-Control private/no-store yang sesuai.
- Metadata robots noindex/nofollow, Referrer-Policy no-referrer, dan proteksi frame. Link eksternal memakai rel noreferrer/noopener.
- Jangan memuat analytics/pixel pihak ketiga pada halaman token. Tidak ada social preview dengan nama atau detail personal.
- Data limiter tidak menyimpan IP mentah bila tidak diperlukan; dokumentasikan cleanup bucket kedaluwarsa.

## 8. Desain dan aksesibilitas
- Dark canvas, neon violet/cyan sebagai aksen, panel menyerupai repository/PR, tipografi modern dan mono untuk label kecil.
- Hero personal dengan komposisi cinematic, glow terkontrol, serta hierarki jelas antara nama, informasi acara, dan CTA RSVP.
- Bahasa antarmuka utama Indonesia; label playful Inggris boleh didampingi makna yang jelas.
- Mobile-first; verifikasi lebar 375, 768, 1024, dan 1440 px tanpa scroll horizontal.
- Target sentuh minimal 44 × 44 px, fokus keyboard terlihat, label form eksplisit, kontras teks minimal 4.5:1, feedback tidak hanya bergantung pada warna.
- Hormati prefers-reduced-motion. Jangan memakai kilatan cepat, audio autoplay, atau boot screen yang mengunci akses.
- Gunakan Lucide/SVG konsisten, bukan emoji sebagai ikon struktural.
- Loading, empty, error, invalid-link, expired-deadline, disabled, dan success state dirancang sebagai bagian produk.

## 9. Teknologi dan deployment
Next.js App Router, TypeScript strict, Tailwind CSS, Motion, Lucide React, Zod, Supabase PostgreSQL/Auth, serta Vercel. Pakai versi stabil yang kompatibel dan lockfile. Pilih Server Actions atau Route Handlers secara konsisten sesuai kebutuhan, dengan boundary server/client yang eksplisit.

Deliverables: kode proyek nyata, migration SQL dan seed placeholder, `.env.example`, README setup lokal/admin/env/deploy, pengujian, dan catatan hasil verifikasi.

Variabel lingkungan yang disarankan: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY (server saja; atau secret key sesuai SDK), NEXT_PUBLIC_SITE_URL. Tambahkan INVITE_PASSWORD_HASH (server-only), serta variabel limiter jika provider terpisah digunakan. Sediakan script CLI setup hash password yang menerima input tersembunyi/stdin, bukan argumen shell atau log. Jangan commit `.env.local`.

Deploy ke subdomain `*.vercel.app` yang tersedia. Konfigurasi environment Vercel dan Supabase Site URL/redirect URL sesuai domain final. Tidak perlu membeli domain. Paket gratis mengikuti syarat dan kuota provider yang berlaku; jangan menjamin biaya atau ketersediaan nama subdomain.

## 10. Acceptance criteria
| Kasus | Hasil yang harus terjadi |
|---|---|
| Admin sah login | Dashboard terbuka; sesi diverifikasi server |
| Tanpa login / user non-admin | Dashboard dan endpoint mutasi menolak akses |
| Tambah tamu | Satu guest dibuat, hash tersimpan, link dapat disalin |
| Link valid | Nama, detail acara, dan formulir langsung tampil tanpa password |
| Hadir dengan password 10.11.2004 atau 10-11-2004 | Kedua format diterima; attending tersimpan dan pass muncul |
| Hadir dengan password salah/format campuran/kosong | Write ditolak; respons lama tidak berubah; tidak menerbitkan pass baru |
| Request attending langsung tanpa password | Server menolak meskipun UI dilewati |
| Maybe/declined tanpa password | Respons tersimpan bila token dan deadline valid |
| Buka ulang setelah attending berhasil | Undangan dan pass tersimpan tampil tanpa password |
| Attending diubah menjadi maybe/declined | Tidak perlu password; pass aktif hilang |
| Respons diubah kembali menjadi attending | Password wajib lagi |
| Percobaan password berlebihan | Konfirmasi attending dibatasi server dengan pesan retry |
| Token salah/nonaktif/diganti | Pesan akses ditolak; tidak ada data personal bocor |
| Pilih attending/maybe/declined | Respons tersimpan setelah validasi sesuai status; attending wajib password |
| Ubah jawaban | Baris yang sama diperbarui; tidak ada RSVP ganda |
| Klik cepat/request paralel | Tidak menambah slot atau membuat respons ganda |
| Deadline lewat | Mutasi ditolak server dengan pesan yang jelas |
| Jaringan gagal | Tidak menampilkan sukses palsu; isian tetap ada dan bisa dicoba ulang |
| Attending berhasil | Digital pass muncul; status lain tidak menampilkan pass aktif |
| Rotasi/nonaktifkan | Link lama gagal pada lookup dan mutasi berikutnya |
| Ubah event settings | Nilai tervalidasi dan terlihat di undangan |
| Serangan payload/+1/status palsu | Server menolak field/nilai tidak diizinkan |
| Limit terlampaui | HTTP 429 atau error setara yang jelas; tidak membocorkan data |
| Mobile, keyboard, reduced motion | Semua fitur inti tetap dapat digunakan |
| Build produksi tanpa secrets | Berhasil bila arsitektur memungkinkan; koneksi runtime memiliki pesan konfigurasi yang jelas |

## 11. Pengujian dan rilis
- Unit: format/entropi token, hashing, schema RSVP, deadline/zona waktu, sanitasi URL, aturan limiter, dua format password, penolakan format lain, attending tanpa password ditolak, maybe/declined tanpa password diterima, dan respons lama tetap utuh saat password salah.
- Integrasi dengan Supabase pengujian: RLS anon/non-admin, upsert paralel, revoke/rotate, admin authorization, pembacaan dan perubahan RSVP.
- Smoke test: root/demo/login/access-denied, alur generate → buka → RSVP → dashboard → rotate.
- Jalankan typecheck, tes yang tersedia, dan production build. Laporkan hasil yang benar-benar dijalankan; pisahkan pemeriksaan statis dari integrasi live.
- Bila kredensial belum tersedia, jangan memalsukan integrasi atau deploy. Sertakan langkah pengujian manual agar penyelenggara bisa menyelesaikannya.

## 12. Di luar cakupan
Import CSV/bulk invite, WhatsApp API, email blast, pembayaran, signup tamu, +1, multi-event UI, QR check-in, verifikasi identitas/OTP tamu, aplikasi native, dan domain berbayar. Tidak mengintegrasikan GitHub API; Pull Request hanya metafora visual.
