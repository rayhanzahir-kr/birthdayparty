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
