-- Attach a host account to a mic without exposing account or PIN data.
begin;
alter table public.mics add column if not exists owner_user_id uuid references auth.users(id) on delete set null;
create index if not exists mics_owner_user_id_idx on public.mics(owner_user_id) where owner_user_id is not null;
-- Claims run only through verified server actions using service role.
-- Keep the deny-by-default client permissions from migration 013.
create table if not exists public.mic_claim_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0
);
alter table public.mic_claim_attempts enable row level security;
revoke all on public.mic_claim_attempts from public, anon, authenticated;
create or replace function public.consume_mic_claim_attempt(p_user_id uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare attempt_count integer;
begin
  insert into public.mic_claim_attempts(user_id, attempts) values(p_user_id, 1)
  on conflict(user_id) do update set
    attempts = case when mic_claim_attempts.window_started_at < now() - interval '1 hour' then 1 else mic_claim_attempts.attempts + 1 end,
    window_started_at = case when mic_claim_attempts.window_started_at < now() - interval '1 hour' then now() else mic_claim_attempts.window_started_at end
  returning attempts into attempt_count;
  return attempt_count <= 5;
end;
$$;
revoke all on function public.consume_mic_claim_attempt(uuid) from public, anon, authenticated;
grant execute on function public.consume_mic_claim_attempt(uuid) to service_role;
commit;
