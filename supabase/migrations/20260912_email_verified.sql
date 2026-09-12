-- ═══════════════════════════════════════════════════════════════════════════
-- BingeTime — soft email verification
--
-- With "Confirm email" OFF (instant login), Supabase marks every user
-- confirmed at signup, so auth.users.email_confirmed_at can't tell us
-- whether the user actually PROVED inbox ownership by clicking the email.
-- profiles.email_verified is our own flag for that:
--   • false on signup (email + password users)
--   • true once the user clicks the confirmation/magic-link email
--     (the app calls mark_email_verified after a successful OTP verify)
--   • true immediately for Google accounts (Google verified the address)
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists email_verified boolean not null default false;

-- The signed-in user can flip their own flag — but only to TRUE, and only
-- for themselves. SECURITY DEFINER is required because the client can't
-- write auth.users-derived state directly; the auth.uid() guard means one
-- user can never touch another's row.
create or replace function public.mark_email_verified ()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid () is null then
    raise exception 'Not authenticated';
  end if;
  update public.profiles
     set email_verified = true
   where id = auth.uid ();
end;
$$;

grant execute on function public.mark_email_verified () to authenticated;
