-- Tests for server-side scoring (supabase/migrations/*_server_side_scoring.sql).
-- Run with `npm run test:db`; any failed check raises an error and stops the script.

create schema test;
grant usage on schema test to anon, authenticated;

-- Fails unless running `stmt` raises an error whose message contains `expected`
create function test.expect_error(stmt text, expected text) returns void language plpgsql as $$
declare
  succeeded boolean := false;
begin
  begin
    execute stmt;
    succeeded := true;
  exception when others then
    if position(expected in sqlerrm) = 0 then
      raise exception 'FAIL: % raised "%", expected "%"', stmt, sqlerrm, expected;
    end if;
  end;
  if succeeded then
    raise exception 'FAIL: % succeeded, expected error "%"', stmt, expected;
  end if;
end $$;

create function test.expect_equal(actual text, expected text, label text) returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL: % = %, expected %', label, actual, expected;
  end if;
end $$;

grant execute on all functions in schema test to anon, authenticated;

insert into auth.users values ('11111111-1111-1111-1111-111111111111');

-- Everything below runs as the signed-in player
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

-- Creating a profile is allowed, and it starts with the guest balance
insert into public.profiles (id, username, city, avatar) values (auth.uid(), 'Alice', 'London', '🤖');
select test.expect_equal((select points::text from public.profiles), '150', 'starting points');

-- Score columns cannot be written directly
select test.expect_error($$update public.profiles set points = 999999 where id = auth.uid()$$, 'permission denied');
select test.expect_error($$update public.profiles set wins = 500 where id = auth.uid()$$, 'permission denied');
select test.expect_error($$insert into public.profiles (id, username, city, avatar, points)
  values ('22222222-2222-2222-2222-222222222222', 'X', 'Y', 'Z', 5000)$$, 'permission denied');
select test.expect_error($$insert into public.matches (id, player_id, username, opponent, mode, result, points_earned)
  values ('m', auth.uid(), 'Alice', 'x', 'ai', 'win', 5000)$$, 'permission denied');

-- Name, city and avatar can still be edited
update public.profiles set username = 'Alice2', city = 'Paris' where id = auth.uid();
select test.expect_equal((select username from public.profiles), 'Alice2', 'renamed');

-- A win against Expert is worth 80 points and counts as a win
select test.expect_equal((select points::text from public.record_match('ai', 'expert', 'win', 'AI (expert)')), '230', 'points after win');
select test.expect_equal((select wins::text from public.profiles), '1', 'wins after win');
select test.expect_equal((select points_earned::text from public.matches), '80', 'recorded match points');

-- Results cannot be spammed, local games do not count, bad input is refused
select test.expect_error($$select public.record_match('ai', 'expert', 'win', 'x')$$, 'Too many results');
select test.expect_error($$select public.record_match('local', null, 'win', 'x')$$, 'Only games against the AI or online count');
select test.expect_error($$select public.record_match('ai', 'impossible', 'win', 'x')$$, 'Invalid difficulty');
select test.expect_error($$select public.record_match('ai', 'easy', 'victory', 'x')$$, 'Invalid result');

-- Spending uses server prices
select test.expect_equal((select points::text from public.spend_points('hint')), '215', 'points after hint');
select test.expect_error($$select public.spend_points('skin:free-gold')$$, 'Unknown item');
select test.expect_error($$select public.spend_points('skin:royal-gold')$$, 'Not enough points');

-- PRO can be activated by the player
select test.expect_equal((select is_pro::text from public.activate_pro()), 'true', 'pro activated');

-- Daily cap: with 590 points already earned today, an 80-point win only adds 10
reset role;
update public.matches set created_at = now() - interval '1 hour', points_earned = 590;
set role authenticated;
select test.expect_equal((select points::text from public.record_match('ai', 'expert', 'win', 'AI (expert)')), '225', 'points after capped win');

-- Signed-out visitors cannot record results or spend points
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select test.expect_error($$select public.record_match('ai', 'easy', 'win', 'x')$$, 'permission denied');
select test.expect_error($$select public.spend_points('hint')$$, 'permission denied');
reset role;

\echo 'scoring tests passed'
