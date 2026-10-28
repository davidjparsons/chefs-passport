-- Chef's Passport: online saving + World Leaderboard
-- Run this once in your Supabase project: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- It is safe to run again.
--
-- How it stays safe without passwords:
--   * Nobody can read or write the `chefs` table directly.
--   * Everyone can read the `leaderboard` view (names, flags, counts, stamps) - no secrets in it.
--   * Saving goes through save_chef(), which only lets you change a chef if you hold that
--     chef's secret (it lives in your browser and in your backup code; only its hash is stored).

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.chefs (
  id          uuid primary key,
  secret_hash text        not null,
  name        text        not null,
  avatar      text,
  unlocked    jsonb       not null default '{}'::jsonb,   -- { "392": "2026-10-28T09:15:00.000Z", ... }
  count       int         not null default 0,
  reached_at  timestamptz not null default now(),         -- when the chef reached `count` (tie-breaker)
  joined_at   timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists chefs_rank_idx on public.chefs (count desc, reached_at asc);

alter table public.chefs enable row level security;   -- no policies = no direct access
revoke all on public.chefs from anon, authenticated;

create or replace view public.leaderboard as
  select id, name, avatar, count, reached_at, joined_at, unlocked
  from public.chefs;
grant select on public.leaderboard to anon, authenticated;

-- Create or update a chef. Places are only ever added (progress can't be lost by an old device
-- syncing late), and reached_at is set by the server when the count goes up.
create or replace function public.save_chef(
  p_id uuid, p_secret text, p_name text, p_avatar text, p_unlocked jsonb, p_joined_at timestamptz
) returns json
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  h      text := encode(extensions.digest(coalesce(p_secret, ''), 'sha256'), 'hex');
  cur    public.chefs;
  merged jsonb;
  n      int;
begin
  if p_secret is null or length(p_secret) < 16 then raise exception 'bad secret'; end if;
  if p_unlocked is null or jsonb_typeof(p_unlocked) <> 'object' then raise exception 'bad unlocked'; end if;

  select * into cur from public.chefs where id = p_id for update;
  if found and cur.secret_hash <> h then raise exception 'wrong secret'; end if;

  merged := coalesce(cur.unlocked, '{}'::jsonb) || p_unlocked;
  select count(*) into n from jsonb_object_keys(merged);
  if n > 400 then raise exception 'too many places'; end if;

  if cur.id is null then
    insert into public.chefs (id, secret_hash, name, avatar, unlocked, count, reached_at, joined_at)
    values (p_id, h, left(coalesce(nullif(trim(p_name), ''), 'Chef'), 20), left(p_avatar, 12), merged, n,
            now(), least(coalesce(p_joined_at, now()), now()));
  else
    update public.chefs set
      name       = left(coalesce(nullif(trim(p_name), ''), 'Chef'), 20),
      avatar     = left(p_avatar, 12),
      unlocked   = merged,
      count      = n,
      reached_at = case when n > cur.count then now() else cur.reached_at end,
      joined_at  = least(cur.joined_at, coalesce(p_joined_at, cur.joined_at)),
      updated_at = now()
    where id = p_id;
  end if;
  return json_build_object('count', n);
end;
$$;

-- Remove a chef from the leaderboard (used when a chef is deleted or their progress is reset).
create or replace function public.delete_chef(p_id uuid, p_secret text) returns void
language sql security definer
set search_path = public, extensions
as $$
  delete from public.chefs
  where id = p_id and secret_hash = encode(extensions.digest(coalesce(p_secret, ''), 'sha256'), 'hex');
$$;

revoke all on function public.save_chef(uuid, text, text, text, jsonb, timestamptz) from public;
revoke all on function public.delete_chef(uuid, text) from public;
grant execute on function public.save_chef(uuid, text, text, text, jsonb, timestamptz) to anon, authenticated;
grant execute on function public.delete_chef(uuid, text) to anon, authenticated;
