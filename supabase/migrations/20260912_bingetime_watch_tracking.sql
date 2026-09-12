-- ═══════════════════════════════════════════════════════════════════════════
-- BingeTime — auth + personal watch-tracking schema
-- Run this whole file in the Supabase Dashboard → SQL Editor (idempotent).
--
-- Design notes
-- ────────────
-- • TMDB ids are the stable content identifiers. (media_type, tmdb_id) is
--   unique together everywhere so movie and TV ids can never collide.
-- • Episodes are identified by (media_type='tv', tmdb_id, season_number,
--   episode_number) — progress is stored per episode, never only per show.
-- • Movies use season_number = -1 / episode_number = -1 as an explicit
--   "N/A" sentinel (NOT NULL), so the single unique constraint below can be
--   the upsert conflict target for BOTH movies and episodes via PostgREST.
-- • One row per (user, content) upserted in place — no duplicate records.
-- • RLS on every table: users can only ever see/modify their own rows.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  name        text not null default '',
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own"  on public.profiles;
drop policy if exists "profiles_update_own"  on public.profiles;
drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_select_own"  on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own"  on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_self" on public.profiles for insert with check (auth.uid() = id);

-- Auto-provision a profile whenever a user signs up.
create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(new.email, ''), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user ();

-- ── watch_progress ──────────────────────────────────────────────────────────
-- One row per user + item. For episodes, season/episode numbers are set and
-- show_tmdb_id points at the parent series; for movies they are -1/null.
-- This single table powers: continue watching, per-episode progress,
-- watched status (>= 90% client-side), and recent activity (updated_at).
create table if not exists public.watch_progress (
  id               bigserial primary key,
  user_id          uuid not null references auth.users (id) on delete cascade,
  media_type       text not null check (media_type in ('movie', 'tv')),
  tmdb_id          integer not null check (tmdb_id > 0),
  season_number    integer not null default -1,   -- -1 = N/A (movies)
  episode_number   integer not null default -1,   -- -1 = N/A (movies)
  show_tmdb_id     integer,                       -- tv only: parent show id
  title            text not null default '',
  poster_path      text,                          -- TMDB poster path for UI cards
  position_seconds numeric not null default 0 check (position_seconds >= 0),
  duration_seconds numeric check (duration_seconds is null or duration_seconds > 0),
  progress_percent numeric not null default 0
                   check (progress_percent >= 0 and progress_percent <= 100),
  watched          boolean not null default false,
  updated_at       timestamptz not null default now(),
  created_at       timestamptz not null default now(),

  -- Episodes must be fully identified; movies must not carry episode info.
  constraint episode_fields_shape check (
    (media_type = 'movie' and season_number = -1 and episode_number = -1 and show_tmdb_id is null)
    or
    (media_type = 'tv' and season_number >= 0 and episode_number >= 1)
  ),
  -- Progress cannot exceed what the duration allows (5% grace for rounding).
  constraint progress_within_duration check (
    duration_seconds is null
    or position_seconds <= duration_seconds * 1.05
  ),
  -- A tv row's show id must match its own tmdb_id (the show itself).
  constraint show_id_matches check (
    media_type = 'movie' or show_tmdb_id = tmdb_id
  ),
  -- One record per user per content unit (no duplicate rows).
  constraint watch_progress_unique unique (user_id, media_type, tmdb_id, season_number, episode_number)
);

create index if not exists watch_progress_user_recent_idx
  on public.watch_progress (user_id, updated_at desc);
create index if not exists watch_progress_user_show_idx
  on public.watch_progress (user_id, media_type, tmdb_id, season_number);

alter table public.watch_progress enable row level security;

drop policy if exists "watch_progress_select_own" on public.watch_progress;
drop policy if exists "watch_progress_insert_own" on public.watch_progress;
drop policy if exists "watch_progress_update_own" on public.watch_progress;
drop policy if exists "watch_progress_delete_own" on public.watch_progress;
create policy "watch_progress_select_own" on public.watch_progress for select using (auth.uid() = user_id);
create policy "watch_progress_insert_own" on public.watch_progress for insert with check (auth.uid() = user_id);
create policy "watch_progress_update_own" on public.watch_progress for update using (auth.uid() = user_id);
create policy "watch_progress_delete_own" on public.watch_progress for delete using (auth.uid() = user_id);

-- keep updated_at honest on every update
create or replace function public.touch_updated_at ()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists watch_progress_touch on public.watch_progress;
create trigger watch_progress_touch
  before update on public.watch_progress
  for each row execute function public.touch_updated_at ();

-- ── user_media_lists ────────────────────────────────────────────────────────
-- Favorites, likes and My List in ONE table, discriminated by list_type.
-- 'tv' rows track the show (never episodes — episodes aren't listable).
create table if not exists public.user_media_lists (
  id             bigserial primary key,
  user_id        uuid not null references auth.users (id) on delete cascade,
  media_type     text not null check (media_type in ('movie', 'tv')),
  tmdb_id        integer not null check (tmdb_id > 0),
  list_type      text not null check (list_type in ('favorite', 'like', 'mylist')),
  title          text not null default '',
  poster_path    text,
  created_at     timestamptz not null default now(),

  constraint user_media_lists_unique unique (user_id, list_type, media_type, tmdb_id)
);

create index if not exists user_media_lists_user_type_idx
  on public.user_media_lists (user_id, list_type, created_at desc);

alter table public.user_media_lists enable row level security;

drop policy if exists "user_media_lists_select_own" on public.user_media_lists;
drop policy if exists "user_media_lists_insert_own" on public.user_media_lists;
drop policy if exists "user_media_lists_delete_own" on public.user_media_lists;
create policy "user_media_lists_select_own" on public.user_media_lists for select using (auth.uid() = user_id);
create policy "user_media_lists_insert_own" on public.user_media_lists for insert with check (auth.uid() = user_id);
create policy "user_media_lists_delete_own" on public.user_media_lists for delete using (auth.uid() = user_id);

-- ── guest → account migration ───────────────────────────────────────────────
-- The client sends its localStorage rows after signup; this function merges
-- them server-side in one call. Best values win (max progress / OR watched);
-- existing list rows are kept and new ones inserted.
create or replace function public.import_guest_data (
  p_progress jsonb,
  p_lists    jsonb
)
returns table (imported_progress integer, imported_lists integer)
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_rows int;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.watch_progress as wp (
    user_id, media_type, tmdb_id, season_number, episode_number, show_tmdb_id,
    title, poster_path, position_seconds, duration_seconds, progress_percent, watched
  )
  select
    v_uid,
    e ->> 'media_type',
    (e ->> 'tmdb_id')::int,
    coalesce(nullif(e ->> 'season_number', '')::int, -1),
    coalesce(nullif(e ->> 'episode_number', '')::int, -1),
    nullif(e ->> 'show_tmdb_id', '')::int,
    coalesce(e ->> 'title', ''),
    nullif(e ->> 'poster_path', ''),
    greatest(coalesce((e ->> 'position_seconds')::numeric, 0), 0),
    (e ->> 'duration_seconds')::numeric,
    least(greatest(coalesce((e ->> 'progress_percent')::numeric, 0), 0), 100),
    coalesce((e ->> 'watched')::boolean, false)
  from jsonb_array_elements(coalesce(p_progress, '[]'::jsonb)) as e
  where e ->> 'media_type' in ('movie', 'tv')
    and coalesce((e ->> 'tmdb_id')::int, 0) > 0
    and (
      e ->> 'media_type' = 'movie'
      or ((e ->> 'season_number')::int is not null and (e ->> 'episode_number')::int is not null)
    )
  on conflict (user_id, media_type, tmdb_id, season_number, episode_number) do update
    set position_seconds  = greatest(wp.position_seconds, excluded.position_seconds),
        duration_seconds  = coalesce(wp.duration_seconds, excluded.duration_seconds),
        progress_percent  = greatest(wp.progress_percent, excluded.progress_percent),
        watched           = wp.watched or excluded.watched,
        title             = case when excluded.title <> '' then excluded.title else wp.title end,
        poster_path       = coalesce(excluded.poster_path, wp.poster_path);

  get diagnostics v_rows = row_count;
  imported_progress := v_rows;

  insert into public.user_media_lists as ul (user_id, list_type, media_type, tmdb_id, title, poster_path)
  select
    v_uid,
    e ->> 'list_type',
    e ->> 'media_type',
    (e ->> 'tmdb_id')::int,
    coalesce(e ->> 'title', ''),
    e ->> 'poster_path'
  from jsonb_array_elements(coalesce(p_lists, '[]'::jsonb)) as e
  where e ->> 'list_type' in ('favorite', 'like', 'mylist')
    and e ->> 'media_type' in ('movie', 'tv')
    and coalesce((e ->> 'tmdb_id')::int, 0) > 0
  on conflict (user_id, list_type, media_type, tmdb_id) do nothing;

  get diagnostics v_rows = row_count;
  imported_lists := v_rows;

  return;
end;
$$;

grant execute on function public.import_guest_data (jsonb, jsonb) to authenticated;
