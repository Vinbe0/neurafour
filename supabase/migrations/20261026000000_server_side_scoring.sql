-- Server-side scoring for the leaderboard.
--
-- Before this, signed-in players wrote their own points, wins and losses straight
-- into public.profiles, so anyone could give themselves any score. Now:
--   * players can only change their name, city and avatar directly
--   * points and stats change only through the functions below, which compute
--     the points themselves, rate-limit results and cap daily earnings
--
-- Results are still reported by the browser (the server does not replay AI games),
-- so the limits bound what a cheater can gain rather than make it impossible.

-- New accounts start with the same balance as a guest profile
alter table public.profiles alter column points set default 150;

-- 1. Players may only edit their own name, city and avatar
revoke insert, update on public.profiles from anon, authenticated;
grant insert (id, username, city, avatar, updated_at) on public.profiles to authenticated;
grant update (username, city, avatar, updated_at) on public.profiles to authenticated;

-- Matches are recorded only by record_match()
revoke insert, update, delete on public.matches from anon, authenticated;

-- 2. Points for one result (matches the client so guests see the same numbers)
create or replace function public.match_points(p_mode text, p_difficulty text, p_result text)
returns integer
language sql
immutable
as $$
  select case
    when p_mode = 'ai' and p_result = 'win' then
      case p_difficulty when 'easy' then 10 when 'medium' then 20 when 'hard' then 50 when 'expert' then 80 else 0 end
    when p_mode = 'ai' and p_result = 'loss' then 5
    when p_mode = 'multiplayer' and p_result = 'win' then 40
    when p_mode = 'multiplayer' and p_result = 'loss' then 10
    when p_mode in ('ai', 'multiplayer') and p_result = 'draw' then 8
    else 0
  end
$$;

-- 3. Record a finished game for the signed-in player and award points
create or replace function public.record_match(p_mode text, p_difficulty text, p_result text, p_opponent text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_last timestamptz;
  v_earned_today integer;
  v_points integer;
  v_profile public.profiles;
begin
  if v_user is null then
    raise exception 'Not signed in';
  end if;
  -- Local two-player games on one screen never count towards the leaderboard
  if p_mode not in ('ai', 'multiplayer') then
    raise exception 'Only games against the AI or online count';
  end if;
  if p_result not in ('win', 'loss', 'draw') then
    raise exception 'Invalid result';
  end if;
  if p_mode = 'ai' and coalesce(p_difficulty, '') not in ('easy', 'medium', 'hard', 'expert') then
    raise exception 'Invalid difficulty';
  end if;

  -- A real game takes longer than 20 seconds
  select max(created_at) into v_last from public.matches where player_id = v_user;
  if v_last is not null and v_last > now() - interval '20 seconds' then
    raise exception 'Too many results in a short time';
  end if;

  -- At most 600 points per rolling day
  select coalesce(sum(points_earned), 0) into v_earned_today
  from public.matches
  where player_id = v_user and created_at > now() - interval '1 day';
  v_points := greatest(0, least(public.match_points(p_mode, p_difficulty, p_result), 600 - v_earned_today));

  insert into public.matches (id, player_id, username, opponent, mode, difficulty, result, points_earned)
  select gen_random_uuid()::text, v_user, p.username, left(coalesce(p_opponent, ''), 40), p_mode,
         case when p_mode = 'ai' then p_difficulty end, p_result, v_points
  from public.profiles p
  where p.id = v_user;
  if not found then
    raise exception 'Profile not found';
  end if;

  update public.profiles
  set points = points + v_points,
      wins = wins + (p_result = 'win')::int,
      losses = losses + (p_result = 'loss')::int,
      draws = draws + (p_result = 'draw')::int,
      updated_at = now()
  where id = v_user
  returning * into v_profile;

  return v_profile;
end;
$$;

-- 4. Spend points on a hint or a skin; prices are fixed here, not sent by the client
create or replace function public.spend_points(p_item text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cost integer;
  v_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  v_cost := case p_item
    when 'hint' then 15
    when 'skin:retro-arcade' then 150
    when 'skin:space-obsidian' then 250
    when 'skin:royal-gold' then 450
  end;
  if v_cost is null then
    raise exception 'Unknown item';
  end if;

  update public.profiles
  set points = points - v_cost, updated_at = now()
  where id = auth.uid() and points >= v_cost
  returning * into v_profile;
  if not found then
    raise exception 'Not enough points';
  end if;

  return v_profile;
end;
$$;

-- 5. PRO is a free demo in this portfolio project
create or replace function public.activate_pro()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  update public.profiles set is_pro = true, updated_at = now()
  where id = auth.uid()
  returning * into v_profile;
  return v_profile;
end;
$$;

revoke execute on function public.record_match(text, text, text, text) from public, anon;
revoke execute on function public.spend_points(text) from public, anon;
revoke execute on function public.activate_pro() from public, anon;
grant execute on function public.record_match(text, text, text, text) to authenticated;
grant execute on function public.spend_points(text) to authenticated;
grant execute on function public.activate_pro() to authenticated;
