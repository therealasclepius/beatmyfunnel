-- Enums
create type user_role as enum ('brand', 'operator', 'admin');
create type challenge_status as enum ('draft', 'open', 'in_review', 'judging', 'completed', 'cancelled');
create type application_status as enum ('pending', 'shortlisted', 'finalist', 'rejected');
create type submission_status as enum ('pending', 'submitted', 'under_review', 'winner', 'runner_up');

-- Profiles
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  display_name text not null,
  company_name text,
  bio text,
  avatar_url text,
  website_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Challenges
create table challenges (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text not null,
  metric_type text not null,
  baseline_value numeric not null,
  prize_amount integer not null,
  max_finalists integer default 5,
  deadline timestamptz not null,
  status challenge_status default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Applications
create table applications (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  operator_id uuid not null references profiles(id) on delete cascade,
  pitch text not null,
  background text,
  relevant_wins text,
  status application_status default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(challenge_id, operator_id)
);

-- Submissions
create table submissions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  operator_id uuid not null references profiles(id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade,
  description text not null,
  evidence_url text,
  claimed_value numeric,
  verified_value numeric,
  status submission_status default 'pending',
  brand_feedback text,
  admin_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(challenge_id, operator_id)
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on profiles for each row execute function update_updated_at();
create trigger challenges_updated_at before update on challenges for each row execute function update_updated_at();
create trigger applications_updated_at before update on applications for each row execute function update_updated_at();
create trigger submissions_updated_at before update on submissions for each row execute function update_updated_at();

-- Row Level Security
alter table profiles enable row level security;
alter table challenges enable row level security;
alter table applications enable row level security;
alter table submissions enable row level security;

-- Profiles: anyone authed can read, users update own
create policy "Profiles are viewable by authenticated users" on profiles for select to authenticated using (true);
create policy "Users can update own profile" on profiles for update to authenticated using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert to authenticated with check (auth.uid() = id);

-- Challenges: anyone can read open+, brands create/update own
create policy "Open challenges are viewable by everyone" on challenges for select using (status != 'draft' or brand_id = auth.uid());
create policy "Brands can create challenges" on challenges for insert to authenticated with check (brand_id = auth.uid());
create policy "Brands can update own challenges" on challenges for update to authenticated using (brand_id = auth.uid());

-- Applications: operators create, brands read own challenge apps
create policy "Operators can create applications" on applications for insert to authenticated with check (operator_id = auth.uid());
create policy "Users can view relevant applications" on applications for select to authenticated using (
  operator_id = auth.uid() or
  challenge_id in (select id from challenges where brand_id = auth.uid())
);
create policy "Brands can update application status" on applications for update to authenticated using (
  challenge_id in (select id from challenges where brand_id = auth.uid())
);

-- Submissions: finalists create, brands+operators read
create policy "Finalists can create submissions" on submissions for insert to authenticated with check (operator_id = auth.uid());
create policy "Users can view relevant submissions" on submissions for select to authenticated using (
  operator_id = auth.uid() or
  challenge_id in (select id from challenges where brand_id = auth.uid())
);
create policy "Brands can update submissions (feedback)" on submissions for update to authenticated using (
  challenge_id in (select id from challenges where brand_id = auth.uid())
);

-- Admin policies (service role bypasses RLS, so these are for admin users via anon key)
create policy "Admins can do anything on challenges" on challenges for all to authenticated using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can do anything on applications" on applications for all to authenticated using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can do anything on submissions" on submissions for all to authenticated using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Create storage bucket for evidence files
insert into storage.buckets (id, name, public) values ('evidence', 'evidence', true);

create policy "Authenticated users can upload evidence" on storage.objects for insert to authenticated with check (bucket_id = 'evidence');
create policy "Anyone can view evidence" on storage.objects for select using (bucket_id = 'evidence');
