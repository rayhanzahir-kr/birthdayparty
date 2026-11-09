-- =============================================================================
-- Placeholder seed for a single event.
--
-- No date or location is invented: event_date and rsvp_deadline are deliberately
-- NULL, and the remaining text uses clearly bracketed placeholders the host is
-- expected to replace via /admin/dashboard -> Event settings.
-- Idempotent: inserts only while the events table is still empty.
-- =============================================================================
insert into public.events (
  title, host_name, event_date, timezone, location_name,
  location_url, dress_code, description, rsvp_deadline
)
select
  'Birthday Protocol',
  '[Host name]',
  null,
  'Europe/Berlin',
  '[Event location]',
  null,
  '[Dress code]',
  'Mission details will be announced soon.',
  null
where not exists (select 1 from public.events);
