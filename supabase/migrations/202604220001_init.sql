create extension if not exists pgcrypto;

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#7F77DD',
  created_at timestamptz default now()
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  course_id uuid references public.courses(id) on delete set null,
  due_date timestamptz,
  is_complete boolean default false,
  source text check (source in ('canvas', 'manual', 'suggested')) default 'manual',
  is_dismissed boolean default false,
  created_at timestamptz default now()
);

create unique index if not exists assignments_user_title_due_uniq
  on public.assignments(user_id, title, due_date);

create table if not exists public.calendar_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  notes text,
  is_done boolean default false,
  source text check (source in ('canvas', 'gcal', 'manual')) default 'manual',
  gcal_event_id text,
  title text,
  created_at timestamptz default now()
);

create unique index if not exists calendar_blocks_user_gcal_event_uniq
  on public.calendar_blocks(user_id, gcal_event_id)
  where gcal_event_id is not null;

create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  canvas_ical_url text,
  gcal_ical_url text,
  overload_threshold_hours integer default 6,
  exam_lookahead_days integer default 14,
  canvas_last_synced_at timestamptz,
  gcal_last_synced_at timestamptz,
  updated_at timestamptz default now()
);

alter table public.courses enable row level security;
alter table public.assignments enable row level security;
alter table public.calendar_blocks enable row level security;
alter table public.settings enable row level security;

drop policy if exists "courses_select_own" on public.courses;
create policy "courses_select_own"
  on public.courses for select
  using (auth.uid() = user_id);

drop policy if exists "courses_insert_own" on public.courses;
create policy "courses_insert_own"
  on public.courses for insert
  with check (auth.uid() = user_id);

drop policy if exists "courses_update_own" on public.courses;
create policy "courses_update_own"
  on public.courses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "courses_delete_own" on public.courses;
create policy "courses_delete_own"
  on public.courses for delete
  using (auth.uid() = user_id);

drop policy if exists "assignments_select_own" on public.assignments;
create policy "assignments_select_own"
  on public.assignments for select
  using (auth.uid() = user_id);

drop policy if exists "assignments_insert_own" on public.assignments;
create policy "assignments_insert_own"
  on public.assignments for insert
  with check (auth.uid() = user_id);

drop policy if exists "assignments_update_own" on public.assignments;
create policy "assignments_update_own"
  on public.assignments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "assignments_delete_own" on public.assignments;
create policy "assignments_delete_own"
  on public.assignments for delete
  using (auth.uid() = user_id);

drop policy if exists "blocks_select_own" on public.calendar_blocks;
create policy "blocks_select_own"
  on public.calendar_blocks for select
  using (auth.uid() = user_id);

drop policy if exists "blocks_insert_own" on public.calendar_blocks;
create policy "blocks_insert_own"
  on public.calendar_blocks for insert
  with check (auth.uid() = user_id);

drop policy if exists "blocks_update_own" on public.calendar_blocks;
create policy "blocks_update_own"
  on public.calendar_blocks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "blocks_delete_own" on public.calendar_blocks;
create policy "blocks_delete_own"
  on public.calendar_blocks for delete
  using (auth.uid() = user_id);

drop policy if exists "settings_select_own" on public.settings;
create policy "settings_select_own"
  on public.settings for select
  using (auth.uid() = user_id);

drop policy if exists "settings_insert_own" on public.settings;
create policy "settings_insert_own"
  on public.settings for insert
  with check (auth.uid() = user_id);

drop policy if exists "settings_update_own" on public.settings;
create policy "settings_update_own"
  on public.settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "settings_delete_own" on public.settings;
create policy "settings_delete_own"
  on public.settings for delete
  using (auth.uid() = user_id);
