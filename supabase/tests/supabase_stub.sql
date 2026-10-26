-- Minimal stand-in for the parts of Supabase the schema relies on, so the schema
-- and migrations can be tested on a plain Postgres database.

do $$
begin
  create role anon nologin;
exception when duplicate_object then null;
end $$;

do $$
begin
  create role authenticated nologin;
exception when duplicate_object then null;
end $$;

create schema auth;
create table auth.users (id uuid primary key);

-- Supabase reads the signed-in user from the request's JWT; tests set it directly
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;

-- Like Supabase: table access is granted broadly, then narrowed by RLS and migrations
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
