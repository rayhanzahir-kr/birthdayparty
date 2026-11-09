-- ============================================================
-- SETUP SUPABASE — LANGKAH 2 dari 2
--
-- SEBELUM RUN: ganti email di bawah dengan email yang kamu pakai
-- saat membuat user di Authentication -> Users -> Add user.
-- ============================================================

insert into public.admin_users (user_id, note)
select id, 'penyelenggara utama'
from auth.users
where email = 'rayhanzahir.kr@gmail.com'      -- <<< ganti baris ini
on conflict (user_id) do nothing;


-- Setelah Run, cek hasilnya. Harus muncul 1 baris berisi email kamu.
-- Kalau KOSONG, berarti email di atas tidak sama dengan email user di
-- Authentication -> Users (salah ketik, atau usernya belum dibuat).
select u.email, au.note, au.created_at
from public.admin_users au
join auth.users u on u.id = au.user_id;
