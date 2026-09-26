create extension if not exists "pgcrypto";

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  subject text not null check (subject in ('literasi','numerasi')),
  level int not null check (level between 1 and 5),
  created_at timestamptz default now()
);

alter table students enable row level security;
alter table assessments enable row level security;
-- Tidak ada policy: akses hanya lewat backend pakai service role key
