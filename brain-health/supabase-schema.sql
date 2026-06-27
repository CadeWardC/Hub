-- ============================================================
-- Brain Health — Supabase schema
-- Run once in the Supabase SQL Editor (Dashboard → SQL → New query).
-- Reuses the same project as smolov.
-- ============================================================

-- ---- Earnings ledger ---------------------------------------
-- One row per completed game. Models a paid micro-task study:
-- each finished task pays a small amount (payout_cents), scaled by
-- accuracy and difficulty.
create table if not exists public.brain_earnings (
    id            bigint generated always as identity primary key,
    cid           text unique,                 -- client id, for idempotent sync
    game_id       text not null,
    game_name     text,
    domain        text,
    score         integer,
    accuracy      real,                         -- 0..1, nullable
    level         integer,
    payout_cents  integer not null,
    date_created  timestamptz not null default now()
);

create index if not exists brain_earnings_created_idx on public.brain_earnings (date_created desc);

-- ---- Row Level Security ------------------------------------
-- Single shared dataset (no per-user auth), matching the rest of the hub.
-- The publishable/anon key may read & write. If you add Supabase Auth later,
-- swap `anon` for `authenticated` and scope rows with user_id = auth.uid().
alter table public.brain_earnings enable row level security;

drop policy if exists "anon read brain_earnings"  on public.brain_earnings;
drop policy if exists "anon write brain_earnings" on public.brain_earnings;
create policy "anon read brain_earnings"  on public.brain_earnings for select to anon using (true);
create policy "anon write brain_earnings" on public.brain_earnings for all    to anon using (true) with check (true);
