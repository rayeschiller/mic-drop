-- A verified host can enroll their recurring dates in one atomic operation.
-- Only service_role may call this after server-side user/PIN verification.
begin;
create or replace function public.claim_mic_series(p_mic_id uuid, p_user_id uuid, p_pin_hash text)
returns table(saved_count integer, already_linked_count integer, skipped_count integer)
language plpgsql security definer set search_path = public, pg_temp as $$
declare anchor public.mics%rowtype;
begin
  -- Serialize overlapping claims before locking rows, including claims from
  -- different dates of the same series. No claim can partially win a series.
  perform pg_advisory_xact_lock(hashtextextended(p_pin_hash, 0));
  select * into anchor from public.mics where id = p_mic_id for update;
  if not found or anchor.host_pin_hash is distinct from p_pin_hash then
    raise exception 'Mic or host PIN is incorrect';
  end if;
  if anchor.owner_user_id is not null and anchor.owner_user_id <> p_user_id then
    raise exception 'This mic is already linked to another account';
  end if;
  if not exists(select 1 from auth.users where id = p_user_id) then
    raise exception 'Account not found';
  end if;
  select count(*)::integer into already_linked_count from public.mics
    where host_pin_hash = p_pin_hash
      and (id = p_mic_id or (nullif(anchor.series_slug, '') is not null and series_slug = anchor.series_slug))
      and owner_user_id = p_user_id;
  select count(*)::integer into skipped_count from public.mics
    where host_pin_hash = p_pin_hash
      and (id = p_mic_id or (nullif(anchor.series_slug, '') is not null and series_slug = anchor.series_slug))
      and owner_user_id is not null and owner_user_id <> p_user_id;
  with saved as (
    update public.mics set owner_user_id = p_user_id
    where host_pin_hash = p_pin_hash
      and (id = p_mic_id or (nullif(anchor.series_slug, '') is not null and series_slug = anchor.series_slug))
      and owner_user_id is null
    returning id
  ) select count(*)::integer into saved_count from saved;
  return next;
end;
$$;
revoke all on function public.claim_mic_series(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.claim_mic_series(uuid, uuid, text) to service_role;
commit;
