-- ============================================================
-- SUPABASE SETUP — STEP 2 of 2
--
-- BEFORE RUNNING: replace the email below with the one you used
-- when creating the user under Authentication -> Users -> Add user.
-- ============================================================

insert into public.admin_users (user_id, note)
select id, 'primary host'
from auth.users
where email = 'REPLACE-ME@example.com'      -- <<< change this line
on conflict (user_id) do nothing;


-- After running, check the result. It must show 1 row with your email.
-- If it is EMPTY, the email above does not match the user in
-- Authentication -> Users (typo, or the user was never created).
select u.email, au.note, au.created_at
from public.admin_users au
join auth.users u on u.id = au.user_id;
