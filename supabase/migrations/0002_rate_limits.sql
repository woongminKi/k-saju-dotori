-- Dotori rate limiting. Additive migration on top of 0001_init.sql (which is already applied to
-- production and must not be edited). Follows the same conventions: IF NOT EXISTS everywhere, RLS
-- enabled with an explicit drop-then-create deny-all policy (Postgres has no CREATE POLICY IF NOT
-- EXISTS), and the service role bypasses RLS. Safe to paste more than once into the SQL editor.

-- Fixed-window counter. One row per (limiter key, window start); `count` is the number of hits seen
-- in that window. The composite primary key is what makes the atomic upsert-increment below possible.
-- `key` is the app-composed `scope:identity` string (e.g. 'teaser:ip:<hash>' or 'checkout:u:<userId>').
create table if not exists rate_limits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (key, window_start)
);
-- Supports the opportunistic stale-window cleanup inside increment_rate_limit (delete-on-read).
create index if not exists rate_limits_window_idx on rate_limits (key, window_start);

-- Atomic increment-or-insert for a single window, returning the new count. Also opportunistically
-- drops this key's older windows so the table stays ~1 row per active key (delete-on-read cleanup —
-- chosen over piggybacking the retention cron because it needs no Store-interface / sweep / cron
-- changes and is fully self-contained here). Runs in one round trip.
create or replace function increment_rate_limit(p_key text, p_window_start timestamptz)
returns int language plpgsql as $$
declare
  new_count int;
begin
  delete from rate_limits where key = p_key and window_start < p_window_start;
  insert into rate_limits (key, window_start, count) values (p_key, p_window_start, 1)
  on conflict (key, window_start) do update set count = rate_limits.count + 1
  returning count into new_count;
  return new_count;
end;
$$;

-- RLS: enable and add an explicit deny-all policy (service role bypasses RLS), matching every table
-- in 0001. drop-then-create because Postgres has no CREATE POLICY IF NOT EXISTS.
alter table rate_limits enable row level security;
drop policy if exists rate_limits_deny_all on rate_limits;
create policy rate_limits_deny_all on rate_limits for all using (false) with check (false);
