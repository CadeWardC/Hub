-- ============================================================
-- Smolov Jr. — Supabase schema
-- Run this once in the Supabase SQL Editor (Dashboard → SQL → New query).
-- ============================================================

-- ---- Tables ------------------------------------------------
create table if not exists public.lift_maxes (
    id            bigint generated always as identity primary key,
    lift_name     text not null,
    weight        integer not null,
    date_created  timestamptz not null default now()
);

create table if not exists public.smolov_plans (
    id                  bigint generated always as identity primary key,
    lift_name           text not null,
    one_rm              integer not null,
    w2_inc              integer not null default 10,
    w3_inc              integer not null default 20,
    completed_days      integer not null default 0,
    streak              integer not null default 0,
    last_completed_date text,
    date_created        timestamptz not null default now()
);

create index if not exists lift_maxes_created_idx  on public.lift_maxes (date_created);
create index if not exists smolov_plans_lift_idx   on public.smolov_plans (lift_name);

-- ---- Row Level Security ------------------------------------
-- This app has no per-user auth (single shared dataset, like the old API
-- token). These policies let the publishable/anon key read & write both
-- tables. If you later add Supabase Auth, replace `anon` with `authenticated`
-- and scope rows with a `user_id = auth.uid()` check.
alter table public.lift_maxes  enable row level security;
alter table public.smolov_plans enable row level security;

-- lift_maxes
drop policy if exists "anon read lift_maxes"   on public.lift_maxes;
drop policy if exists "anon write lift_maxes"  on public.lift_maxes;
create policy "anon read lift_maxes"  on public.lift_maxes for select to anon using (true);
create policy "anon write lift_maxes" on public.lift_maxes for all    to anon using (true) with check (true);

-- smolov_plans
drop policy if exists "anon read smolov_plans"  on public.smolov_plans;
drop policy if exists "anon write smolov_plans" on public.smolov_plans;
create policy "anon read smolov_plans"  on public.smolov_plans for select to anon using (true);
create policy "anon write smolov_plans" on public.smolov_plans for all    to anon using (true) with check (true);
