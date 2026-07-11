-- Dotori initial schema. Consolidated from the Korean saju app's 10 incremental migrations
-- into one fresh-project CREATE-time schema. All access is server-side via the service-role
-- key; RLS is enabled with a deny-all policy on every table, and the service role bypasses RLS.

-- Users. provider_id holds the external OAuth provider identity key
-- (Google OAuth subject id via Supabase Auth's 'google' provider).
create table if not exists users (
  id uuid primary key,
  provider_id text,
  referral_code text not null,
  referred_by uuid,
  created_at timestamptz not null default now()
);
create unique index if not exists users_referral_code_idx on users (referral_code);

-- Credits/entitlements ledger. Records signed credit deltas per user (Store interface mapping).
create table if not exists ledger (
  id bigserial primary key,
  user_id uuid not null,
  delta int not null,
  reason text not null,
  ref text,
  at timestamptz not null default now()
);
create index if not exists ledger_user_idx on ledger (user_id);

-- Orders. amount_cents is the USD amount in cents; currency defaults to 'usd'.
-- product distinguishes order kinds: reading passes ('reading') vs. Dotori draw credits ('oracle').
create table if not exists orders (
  id uuid primary key,
  user_id uuid not null,
  units int not null,
  amount_cents int not null,
  currency text not null default 'usd',
  status text not null,
  pg_token text unique,
  points_applied int not null default 0,
  product text not null default 'reading',
  created_at timestamptz not null default now()
);

-- Double-payment guard (DB-level last line of defense). An application-level check-then-act guard
-- cannot block fully concurrent requests (two requests passing the pending-orders lookup at nearly
-- the same instant). This partial unique index enforces that only one pending order can exist at a
-- time for the same user, product, units, and applied points. Once status leaves 'pending' (e.g.
-- 'paid') the row drops out of the index, so legitimate re-purchases of the same package are allowed.
create unique index if not exists orders_pending_dedup_idx
  on orders (user_id, product, units, points_applied)
  where status = 'pending';

-- Readings. 30-day expiry: expires_at is set by the app layer; the expiry index supports cleanup.
create table if not exists readings (
  id uuid primary key,
  user_id uuid not null,
  menu text not null,
  birth_hash text not null,
  encrypted_inputs text not null,
  result_json text not null,
  created_at timestamptz not null,
  expires_at timestamptz not null
);
create index if not exists readings_lookup_idx on readings (user_id, menu, birth_hash);
create index if not exists readings_expiry_idx on readings (expires_at);

-- Per-menu aggregate counters.
create table if not exists menu_counts (
  menu text primary key,
  count bigint not null default 0
);

-- Atomic increment of a menu's aggregate count.
create or replace function increment_menu_count(p_menu text)
returns void language sql as $$
  insert into menu_counts (menu, count) values (p_menu, 1)
  on conflict (menu) do update set count = menu_counts.count + 1;
$$;

-- Referral points ledger. Records signed point deltas per user.
create table if not exists points_ledger (
  id bigserial primary key,
  user_id uuid not null,
  delta int not null,
  reason text not null,
  ref text,
  at timestamptz not null default now()
);
create index if not exists points_ledger_user_idx on points_ledger (user_id);

-- Compatibility rooms (host room + guest submissions). host_name is the host's display name
-- shown to guests (e.g. "compatibility with OO"); nullable so reads don't break without it
-- (app-layer fallback to "invited friend").
create table if not exists compat_rooms (
  id uuid primary key,
  host_user_id uuid not null,
  host_birth_encrypted text not null,
  host_name text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists compat_rooms_expiry_idx on compat_rooms (expires_at);
-- Index for listing a host's rooms (compat rooms within /library).
create index if not exists compat_rooms_host_idx on compat_rooms (host_user_id);

create table if not exists compat_room_entries (
  id uuid primary key,
  room_id uuid not null,
  nickname text not null,
  guest_birth_encrypted text not null,
  score int not null,
  created_at timestamptz not null default now(),
  constraint compat_room_entries_room_nick_unique unique (room_id, nickname)
);
create index if not exists compat_room_entries_room_idx on compat_room_entries (room_id);

-- Share card snapshots. No PII (display values only). 90-day expiry is set by the app layer.
create table if not exists share_cards (
  id text primary key,
  kind text not null,
  payload jsonb not null,
  payload_hash text not null,
  room_id uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists share_cards_expires_idx on share_cards (expires_at);
create index if not exists share_cards_hash_idx on share_cards (payload_hash);

-- Row Level Security: enable RLS and add an explicit deny-all policy on every table.
-- No caller other than the service role can read/write; the service role bypasses RLS.
alter table users enable row level security;
alter table ledger enable row level security;
alter table orders enable row level security;
alter table readings enable row level security;
alter table menu_counts enable row level security;
alter table points_ledger enable row level security;
alter table compat_rooms enable row level security;
alter table compat_room_entries enable row level security;
alter table share_cards enable row level security;

create policy users_deny_all on users for all using (false) with check (false);
create policy ledger_deny_all on ledger for all using (false) with check (false);
create policy orders_deny_all on orders for all using (false) with check (false);
create policy readings_deny_all on readings for all using (false) with check (false);
create policy menu_counts_deny_all on menu_counts for all using (false) with check (false);
create policy points_ledger_deny_all on points_ledger for all using (false) with check (false);
create policy compat_rooms_deny_all on compat_rooms for all using (false) with check (false);
create policy compat_room_entries_deny_all on compat_room_entries for all using (false) with check (false);
create policy share_cards_deny_all on share_cards for all using (false) with check (false);

-- Test-only: empty every table (called from contract-test beforeEach).
-- truncate ... restart identity needs sequence ownership, which service_role lacks (42501),
-- so run as definer (owner) with a fixed search_path, and revoke execute from anon/authenticated
-- (this wipes everything, so it is dangerous).
create or replace function truncate_all_test_tables()
returns void language sql security definer set search_path = public as $$
  truncate share_cards, compat_room_entries, compat_rooms, ledger, points_ledger, orders, readings, menu_counts, users restart identity;
$$;
revoke execute on function truncate_all_test_tables() from public, anon, authenticated;
grant execute on function truncate_all_test_tables() to service_role;
