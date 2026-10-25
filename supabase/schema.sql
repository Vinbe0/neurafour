create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  city text not null,
  avatar text not null,
  points integer not null default 0,
  is_pro boolean not null default false,
  wins integer not null default 0,
  losses integer not null default 0,
  draws integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.matches (
  id text primary key,
  player_id uuid not null references public.profiles(id) on delete cascade,
  username text not null,
  opponent text not null,
  mode text not null,
  difficulty text,
  result text not null,
  points_earned integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.matches enable row level security;

create policy "Public leaderboard read"
on public.profiles for select
using (true);

create policy "Users create own profile"
on public.profiles for insert
with check (auth.uid() = id);

create policy "Users update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users insert own matches"
on public.matches for insert
with check (auth.uid() = player_id);

create policy "Users read own matches"
on public.matches for select
using (auth.uid() = player_id);
