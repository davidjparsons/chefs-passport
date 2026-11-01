-- Chef's Passport: Party mode (a GeoGuessr-style guessing game with friends)
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run. Safe to run again.
-- Needs supabase-setup.sql to have been run first (same project).
--
-- Everyone can read parties and their players (that's how the game shows the lobby and scores).
-- All changes go through the functions below, which check that you are the host where it matters.

create table if not exists public.parties (
  code             text primary key,
  host             uuid not null,
  state            text not null default 'lobby',     -- lobby | playing | finished
  round            int  not null default 0,
  rounds           jsonb not null default '[]'::jsonb, -- place ids, one per round
  round_seconds    int  not null default 90,
  round_started_at timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.party_players (
  party_code text not null references public.parties(code) on delete cascade,
  player_id  uuid not null,
  name       text not null,
  avatar     text,
  score      int  not null default 0,
  guesses    jsonb not null default '{}'::jsonb,       -- { "1": {"lat": .., "lon": .., "points": ..}, ... }
  joined_at  timestamptz not null default now(),
  primary key (party_code, player_id)
);

alter table public.parties enable row level security;
alter table public.party_players enable row level security;
drop policy if exists "anyone can read parties" on public.parties;
drop policy if exists "anyone can read party players" on public.party_players;
create policy "anyone can read parties" on public.parties for select using (true);
create policy "anyone can read party players" on public.party_players for select using (true);
revoke all on public.parties, public.party_players from anon, authenticated;
grant select on public.parties, public.party_players to anon, authenticated;

create or replace function public.create_party(p_player uuid, p_name text, p_avatar text) returns text
language plpgsql security definer set search_path = public as $$
declare c text; i int;
begin
  delete from parties where updated_at < now() - interval '1 day';   -- tidy up old parties
  loop
    c := '';
    for i in 1..5 loop c := c || substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1); end loop;
    exit when not exists (select 1 from parties where code = c);
  end loop;
  insert into parties (code, host) values (c, p_player);
  insert into party_players (party_code, player_id, name, avatar)
  values (c, p_player, left(coalesce(nullif(trim(p_name), ''), 'Chef'), 20), left(p_avatar, 12));
  return c;
end; $$;

create or replace function public.join_party(p_code text, p_player uuid, p_name text, p_avatar text) returns text
language plpgsql security definer set search_path = public as $$
declare pa parties;
begin
  select * into pa from parties where code = upper(trim(p_code));
  if not found then raise exception 'There''s no party with that code'; end if;
  if exists (select 1 from party_players where party_code = pa.code and player_id = p_player) then
    update party_players set name = left(coalesce(nullif(trim(p_name), ''), 'Chef'), 20), avatar = left(p_avatar, 12)
    where party_code = pa.code and player_id = p_player;
    return pa.code;
  end if;
  if pa.state <> 'lobby' then raise exception 'That party has already started'; end if;
  if (select count(*) from party_players where party_code = pa.code) >= 12 then raise exception 'That party is full (12 players)'; end if;
  insert into party_players (party_code, player_id, name, avatar)
  values (pa.code, p_player, left(coalesce(nullif(trim(p_name), ''), 'Chef'), 20), left(p_avatar, 12));
  update parties set updated_at = now() where code = pa.code;
  return pa.code;
end; $$;

create or replace function public.start_party(p_code text, p_player uuid, p_rounds jsonb, p_seconds int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from parties where code = p_code and host = p_player) then raise exception 'Only the host can start the game'; end if;
  if jsonb_typeof(p_rounds) <> 'array' or jsonb_array_length(p_rounds) not between 1 and 20 then raise exception 'bad rounds'; end if;
  update party_players set score = 0, guesses = '{}'::jsonb where party_code = p_code;
  update parties set state = 'playing', round = 1, rounds = p_rounds, round_seconds = greatest(20, least(coalesce(p_seconds, 90), 300)),
         round_started_at = now(), updated_at = now()
  where code = p_code;
end; $$;

create or replace function public.submit_guess(p_code text, p_player uuid, p_round int, p_lat float8, p_lon float8, p_points int) returns void
language plpgsql security definer set search_path = public as $$
declare pa parties;
begin
  select * into pa from parties where code = p_code;
  if not found or pa.state <> 'playing' or pa.round <> p_round then return; end if;
  update party_players set
    guesses = guesses || jsonb_build_object(p_round::text, jsonb_build_object('lat', p_lat, 'lon', p_lon, 'points', greatest(0, least(coalesce(p_points, 0), 5000)))),
    score   = score + greatest(0, least(coalesce(p_points, 0), 5000))
  where party_code = p_code and player_id = p_player and not (guesses ? p_round::text);
  update parties set updated_at = now() where code = p_code;
end; $$;

create or replace function public.next_round(p_code text, p_player uuid, p_from_round int) returns void
language plpgsql security definer set search_path = public as $$
begin
  update parties set
    round            = case when round < jsonb_array_length(rounds) then round + 1 else round end,
    state            = case when round < jsonb_array_length(rounds) then 'playing' else 'finished' end,
    round_started_at = now(), updated_at = now()
  where code = p_code and host = p_player and state = 'playing' and round = p_from_round;
end; $$;

create or replace function public.back_to_lobby(p_code text, p_player uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update parties set state = 'lobby', round = 0, updated_at = now() where code = p_code and host = p_player;
end; $$;

create or replace function public.leave_party(p_code text, p_player uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from party_players where party_code = p_code and player_id = p_player;
  if not exists (select 1 from party_players where party_code = p_code) then
    delete from parties where code = p_code;
  else
    update parties set
      host = case when host = p_player
                  then (select player_id from party_players where party_code = p_code order by joined_at limit 1)
                  else host end,
      updated_at = now()
    where code = p_code;
  end if;
end; $$;

revoke all on function public.create_party(uuid, text, text) from public;
revoke all on function public.join_party(text, uuid, text, text) from public;
revoke all on function public.start_party(text, uuid, jsonb, int) from public;
revoke all on function public.submit_guess(text, uuid, int, float8, float8, int) from public;
revoke all on function public.next_round(text, uuid, int) from public;
revoke all on function public.back_to_lobby(text, uuid) from public;
revoke all on function public.leave_party(text, uuid) from public;
grant execute on function public.create_party(uuid, text, text) to anon, authenticated;
grant execute on function public.join_party(text, uuid, text, text) to anon, authenticated;
grant execute on function public.start_party(text, uuid, jsonb, int) to anon, authenticated;
grant execute on function public.submit_guess(text, uuid, int, float8, float8, int) to anon, authenticated;
grant execute on function public.next_round(text, uuid, int) to anon, authenticated;
grant execute on function public.back_to_lobby(text, uuid) to anon, authenticated;
grant execute on function public.leave_party(text, uuid) to anon, authenticated;
