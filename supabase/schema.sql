-- ═════════════════════════════════════════════════════════════════════
-- AgroPulse Precision — database schema
-- Run once in: Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run (idempotent). Every table has Row Level Security (RLS):
-- a signed-in user can only ever read or change their own rows.
-- ═════════════════════════════════════════════════════════════════════

-- ── Helpers ──────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ── profiles ─────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text check (char_length(full_name) <= 100),
  region text check (char_length(region) <= 120),
  farm_scale text not null default 'smallholder' check (farm_scale in ('smallholder','commercial','cooperative','research')),
  preferred_language text not null default 'en' check (preferred_language in ('en','bn','hi')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Create a profile automatically when a user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 100))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── soil_tests ───────────────────────────────────────────────────────
create table if not exists public.soil_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  sample_name text check (char_length(sample_name) <= 80),
  soil_type text not null check (soil_type in ('alluvial','black','red','laterite','clay','sandy_loam')),
  nitrogen numeric not null check (nitrogen between 0 and 1500),
  phosphorus numeric not null check (phosphorus between 0 and 300),
  potassium numeric not null check (potassium between 0 and 1500),
  ph numeric not null check (ph between 3 and 10.5),
  organic_carbon numeric not null check (organic_carbon between 0 and 10),
  ec numeric not null check (ec between 0 and 20),
  moisture numeric not null check (moisture between 0 and 100),
  score smallint not null check (score between 0 and 100),
  rating text not null check (rating in ('excellent','good','moderate','poor')),
  issues text[] not null default '{}',
  products text[] not null default '{}',
  result jsonb,
  ai_brief text check (char_length(ai_brief) <= 8000),
  locale text not null default 'en' check (locale in ('en','bn','hi')),
  created_at timestamptz not null default now()
);
create index if not exists soil_tests_user_created_idx on public.soil_tests (user_id, created_at desc);
alter table public.soil_tests enable row level security;
drop policy if exists "soil_select_own" on public.soil_tests;
create policy "soil_select_own" on public.soil_tests for select to authenticated using (auth.uid() = user_id);
drop policy if exists "soil_insert_own" on public.soil_tests;
create policy "soil_insert_own" on public.soil_tests for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "soil_delete_own" on public.soil_tests;
create policy "soil_delete_own" on public.soil_tests for delete to authenticated using (auth.uid() = user_id);

-- ── crop_predictions ─────────────────────────────────────────────────
create table if not exists public.crop_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  crop text not null check (crop in ('rice','wheat','maize','jute','potato','mustard','sugarcane','chickpea','soybean','tomato')),
  season text not null check (season in ('kharif','rabi','zaid')),
  area_acres numeric not null check (area_acres > 0 and area_acres <= 10000),
  irrigation text not null check (irrigation in ('drip','sprinkler','flood','rainfed')),
  rainfall_mm numeric not null check (rainfall_mm between 0 and 5000),
  biofertiliser boolean not null default false,
  biopesticide boolean not null default false,
  per_acre numeric not null,
  total_yield numeric not null,
  vs_baseline_pct numeric,
  risk text not null check (risk in ('low','moderate','high')),
  confidence text not null check (confidence in ('low','moderate','high')),
  inputs jsonb,
  result jsonb,
  ai_brief text check (char_length(ai_brief) <= 8000),
  locale text not null default 'en' check (locale in ('en','bn','hi')),
  created_at timestamptz not null default now()
);
create index if not exists crop_predictions_user_created_idx on public.crop_predictions (user_id, created_at desc);
alter table public.crop_predictions enable row level security;
drop policy if exists "yield_select_own" on public.crop_predictions;
create policy "yield_select_own" on public.crop_predictions for select to authenticated using (auth.uid() = user_id);
drop policy if exists "yield_insert_own" on public.crop_predictions;
create policy "yield_insert_own" on public.crop_predictions for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "yield_delete_own" on public.crop_predictions;
create policy "yield_delete_own" on public.crop_predictions for delete to authenticated using (auth.uid() = user_id);

-- ── bio_treatments (application plans) ───────────────────────────────
create table if not exists public.bio_treatments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_id text not null check (product_id in ('rhizobium','azotobacter','azospirillum','psb','kmb','vam','bga','trichoderma','pseudomonas','bt','beauveria','neem')),
  category text not null check (category in ('biofertiliser','biopesticide','botanical')),
  crop text not null check (crop in ('rice','wheat','maize','jute','potato','mustard','sugarcane','chickpea','soybean','tomato')),
  area_acres numeric not null check (area_acres > 0 and area_acres <= 30000),
  dose_amount numeric not null check (dose_amount >= 0),
  dose_unit text not null check (dose_unit in ('kg','L')),
  scheduled_date date,
  status text not null default 'planned' check (status in ('planned','applied','verified')),
  notes text check (char_length(notes) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bio_treatments_user_created_idx on public.bio_treatments (user_id, created_at desc);
drop trigger if exists bio_treatments_updated_at on public.bio_treatments;
create trigger bio_treatments_updated_at before update on public.bio_treatments
  for each row execute function public.set_updated_at();
alter table public.bio_treatments enable row level security;
drop policy if exists "plans_select_own" on public.bio_treatments;
create policy "plans_select_own" on public.bio_treatments for select to authenticated using (auth.uid() = user_id);
drop policy if exists "plans_insert_own" on public.bio_treatments;
create policy "plans_insert_own" on public.bio_treatments for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "plans_update_own" on public.bio_treatments;
create policy "plans_update_own" on public.bio_treatments for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "plans_delete_own" on public.bio_treatments;
create policy "plans_delete_own" on public.bio_treatments for delete to authenticated using (auth.uid() = user_id);

-- ── AI agronomist conversations ──────────────────────────────────────
create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default '' check (char_length(title) <= 120),
  locale text not null default 'en' check (locale in ('en','bn','hi')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists chat_conversations_user_updated_idx on public.chat_conversations (user_id, updated_at desc);
alter table public.chat_conversations enable row level security;
drop policy if exists "conv_select_own" on public.chat_conversations;
create policy "conv_select_own" on public.chat_conversations for select to authenticated using (auth.uid() = user_id);
drop policy if exists "conv_insert_own" on public.chat_conversations;
create policy "conv_insert_own" on public.chat_conversations for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "conv_update_own" on public.chat_conversations;
create policy "conv_update_own" on public.chat_conversations for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "conv_delete_own" on public.chat_conversations;
create policy "conv_delete_own" on public.chat_conversations for delete to authenticated using (auth.uid() = user_id);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(content) between 1 and 8000),
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_conv_created_idx on public.chat_messages (conversation_id, created_at);
alter table public.chat_messages enable row level security;
drop policy if exists "msg_select_own" on public.chat_messages;
create policy "msg_select_own" on public.chat_messages for select to authenticated using (auth.uid() = user_id);
drop policy if exists "msg_insert_own" on public.chat_messages;
create policy "msg_insert_own" on public.chat_messages for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.chat_conversations c where c.id = conversation_id and c.user_id = auth.uid())
  );
drop policy if exists "msg_delete_own" on public.chat_messages;
create policy "msg_delete_own" on public.chat_messages for delete to authenticated using (auth.uid() = user_id);

-- Bump the conversation's updated_at whenever a message is added.
create or replace function public.touch_conversation()
returns trigger language plpgsql set search_path = '' as $$
begin
  update public.chat_conversations set updated_at = now() where id = new.conversation_id;
  return new;
end $$;
drop trigger if exists chat_messages_touch on public.chat_messages;
create trigger chat_messages_touch after insert on public.chat_messages
  for each row execute function public.touch_conversation();

-- ── Distributed rate limiting (used only by the server with the service-role key) ──
create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);
alter table public.rate_limits enable row level security;  -- no policies: invisible to anon/authenticated

create or replace function public.consume_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count integer;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, v_start, 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning r.count into v_count;

  -- Opportunistic cleanup keeps the table small.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_count <= p_limit;
end $$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
revoke all on table public.rate_limits from anon, authenticated;

-- ── API privileges ──────────────────────────────────────────────────
-- RLS controls which rows are visible; SQL privileges control which
-- operations the Supabase API roles may attempt. Keep these explicit so
-- the schema works even when project default privileges have been changed.
grant usage on schema public to authenticated;

revoke all on table public.profiles, public.soil_tests, public.crop_predictions,
  public.bio_treatments, public.chat_conversations, public.chat_messages
  from anon, authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, delete on table public.soil_tests to authenticated;
grant select, insert, delete on table public.crop_predictions to authenticated;
grant select, insert, update, delete on table public.bio_treatments to authenticated;
grant select, insert, update, delete on table public.chat_conversations to authenticated;
grant select, insert, delete on table public.chat_messages to authenticated;
