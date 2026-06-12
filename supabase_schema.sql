-- ============================================================
-- Windows AI Assistant — Supabase Schema
-- Updated to reflect live DB as of v0.4.5
-- Run this in full in the Supabase SQL Editor (fresh setup only)
-- For existing DBs use the migration script at the bottom
-- ============================================================


-- ============================================================
-- EXTENSIONS
-- ============================================================

create extension if not exists "uuid-ossp";


-- ============================================================
-- USERS
-- Mirrors auth.users; stores profile, subscription, and
-- token usage info.
-- ============================================================

create table public.users (
  id                      uuid primary key references auth.users(id) on delete cascade,
  email                   text not null,
  display_name            text,
  role                    text not null default 'user' check (role in ('user', 'admin')),
  tier                    text not null default 'free' check (tier in ('free', 'pro', 'enterprise')),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  is_admin                boolean not null default false,
  is_blocked              boolean not null default false,
  trial_started_at        timestamptz,
  trial_ended_at          timestamptz,
  subscription_status     varchar default 'trial' check (subscription_status in ('trial', 'active', 'expired', 'cancelled')),
  subscription_started_at timestamptz,
  subscription_ends_at    timestamptz,
  last_payment_at         timestamptz,
  tokens_used_this_month  integer not null default 0,
  tokens_used_all_time    integer not null default 0,
  estimated_cost_usd      numeric not null default 0
);

-- Auto-create a users row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, display_name, trial_started_at, trial_ended_at, subscription_status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    now(),
    now() + interval '14 days',
    'trial'
  );
  perform public.seed_defaults_for_user(new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_updated_at
  before update on public.users
  for each row execute procedure public.set_updated_at();

-- Increment token usage counters
create or replace function public.increment_user_tokens(
  user_id      uuid,
  tokens_count integer,
  cost         numeric
)
returns void language plpgsql security definer as $$
begin
  update public.users
  set
    tokens_used_this_month = tokens_used_this_month + tokens_count,
    tokens_used_all_time   = tokens_used_all_time   + tokens_count,
    estimated_cost_usd     = estimated_cost_usd     + cost,
    updated_at             = now()
  where id = user_id;
end;
$$;


-- ============================================================
-- INSTRUCTIONS  (Layer 2)
-- Persistent behavioural rules per user.
-- Optional context_app / context_folder make them conditional.
-- ============================================================

create table public.instructions (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.users(id) on delete cascade,
  label            text not null,
  instruction_text text not null,
  context_app      text,
  context_folder   text,
  is_active        boolean not null default true,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_instructions_user_id     on public.instructions(user_id);
create index idx_instructions_user_active on public.instructions(user_id, is_active);

create trigger instructions_updated_at
  before update on public.instructions
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- SKILLS  (Layer 3)
-- Reusable named actions surfaced in the command palette.
-- ============================================================

create table public.skills (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.users(id) on delete cascade,
  name             text not null,
  description      text,
  prompt           text not null,
  context_app      text,
  context_folder   text,
  is_destructive   boolean not null default false,
  is_active        boolean not null default true,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_skills_user_id     on public.skills(user_id);
create index idx_skills_user_active on public.skills(user_id, is_active);

create trigger skills_updated_at
  before update on public.skills
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- CONVERSATIONS
-- One conversation = one palette session.
-- ============================================================

create table public.conversations (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.users(id) on delete cascade,
  title            text,
  context_app      text,
  context_folder   text,
  context_text     text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_conversations_user_id      on public.conversations(user_id);
create index idx_conversations_user_created on public.conversations(user_id, created_at desc);

create trigger conversations_updated_at
  before update on public.conversations
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- MESSAGES
-- Individual turns within a conversation.
-- ============================================================

create table public.messages (
  id               uuid primary key default uuid_generate_v4(),
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  user_id          uuid not null references public.users(id) on delete cascade,
  role             text not null check (role in ('user', 'assistant')),
  content          text not null,
  created_at       timestamptz not null default now()
);

create index idx_messages_conversation_id on public.messages(conversation_id);
create index idx_messages_user_id         on public.messages(user_id);


-- ============================================================
-- ACTIONS
-- Log of every AI query and write-action taken.
-- Feeds History page and Analytics dashboard.
-- ============================================================

create table public.actions (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.users(id) on delete cascade,
  conversation_id  uuid references public.conversations(id) on delete set null,
  skill_id         uuid references public.skills(id) on delete set null,
  action_type      text not null,
  action_label     text not null,
  context_app      text,
  context_folder   text,
  context_text     text,
  status           text not null default 'completed'
                   check (status in ('completed', 'confirmed', 'cancelled', 'failed')),
  created_at       timestamptz not null default now()
);

create index idx_actions_user_id      on public.actions(user_id);
create index idx_actions_user_created on public.actions(user_id, created_at desc);


-- ============================================================
-- TOKEN USAGE
-- Detailed per-call token and cost tracking.
-- ============================================================

create table public.token_usage (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references public.users(id) on delete cascade,
  action_id      uuid references public.actions(id) on delete set null,
  input_tokens   integer not null default 0,
  output_tokens  integer not null default 0,
  total_tokens   integer not null default 0,
  cost_usd       numeric not null default 0,
  action_type    varchar,
  model          varchar,
  created_at     timestamptz not null default now()
);

create index idx_token_usage_user_id      on public.token_usage(user_id);
create index idx_token_usage_user_created on public.token_usage(user_id, created_at desc);


-- ============================================================
-- BILLING RECORDS
-- Manual subscription activations and payment history.
-- ============================================================

create table public.billing_records (
  id                        bigint generated always as identity primary key,
  user_id                   uuid not null references public.users(id) on delete cascade,
  amount_usd                numeric not null default 0,
  payment_date              timestamptz,
  subscription_period_start timestamptz,
  subscription_period_end   timestamptz,
  status                    varchar,
  notes                     text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index idx_billing_records_user_id on public.billing_records(user_id);


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.users          enable row level security;
alter table public.instructions   enable row level security;
alter table public.skills         enable row level security;
alter table public.conversations  enable row level security;
alter table public.messages       enable row level security;
alter table public.actions        enable row level security;
alter table public.token_usage    enable row level security;
alter table public.billing_records enable row level security;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and (role = 'admin' or is_admin = true)
  );
$$;

-- USERS
create policy "Users can view own profile"
  on public.users for select
  using (id = auth.uid() or public.is_admin());

create policy "Users can update own profile"
  on public.users for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Admins can manage all users"
  on public.users for all
  using (public.is_admin());

-- INSTRUCTIONS
create policy "Users can manage own instructions"
  on public.instructions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Admins can view all instructions"
  on public.instructions for select
  using (public.is_admin());

-- SKILLS
create policy "Users can manage own skills"
  on public.skills for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Admins can view all skills"
  on public.skills for select
  using (public.is_admin());

-- CONVERSATIONS
create policy "Users can manage own conversations"
  on public.conversations for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Admins can view all conversations"
  on public.conversations for select
  using (public.is_admin());

-- MESSAGES
create policy "Users can manage own messages"
  on public.messages for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Admins can view all messages"
  on public.messages for select
  using (public.is_admin());

-- ACTIONS
create policy "Users can manage own actions"
  on public.actions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Admins can view all actions"
  on public.actions for select
  using (public.is_admin());

-- TOKEN USAGE
create policy "Users can view own token usage"
  on public.token_usage for select
  using (user_id = auth.uid());

create policy "Service can insert token usage"
  on public.token_usage for insert
  with check (user_id = auth.uid());

create policy "Admins can view all token usage"
  on public.token_usage for select
  using (public.is_admin());

-- BILLING RECORDS
create policy "Users can view own billing records"
  on public.billing_records for select
  using (user_id = auth.uid());

create policy "Admins can manage all billing records"
  on public.billing_records for all
  using (public.is_admin());


-- ============================================================
-- SEED: DEFAULT INSTRUCTIONS + SKILLS FOR NEW USERS
-- ============================================================

create or replace function public.seed_defaults_for_user(p_user_id uuid)
returns void language plpgsql security definer as $$
begin

  insert into public.instructions (user_id, label, instruction_text, sort_order) values
    (p_user_id, 'Concise responses', 'Keep all responses concise and to the point. Avoid unnecessary padding.', 0),
    (p_user_id, 'Friendly tone',     'Use a friendly, professional tone in all responses.', 1);

  insert into public.skills (user_id, name, description, prompt, sort_order) values
    (p_user_id, 'Summarize',             'Summarize the selected text',                  'Summarize the following text clearly and concisely:\n\n{{selected_text}}', 0),
    (p_user_id, 'Rewrite professionally','Rewrite selected text in a professional tone', 'Rewrite the following text in a clear, professional tone:\n\n{{selected_text}}', 1),
    (p_user_id, 'Explain this',          'Explain the selected text or code',            'Explain the following in plain language:\n\n{{selected_text}}', 2),
    (p_user_id, 'Fix grammar',           'Fix grammar and spelling errors',              'Fix all grammar and spelling errors in the following text. Return only the corrected text:\n\n{{selected_text}}', 3);

end;
$$;


-- ============================================================
-- MIGRATION SCRIPT
-- For existing databases — run ONLY if your DB already exists.
-- Skip this section for fresh installations.
-- ============================================================

/*

-- Add missing columns to users
alter table public.users
  add column if not exists is_admin                boolean not null default false,
  add column if not exists is_blocked              boolean not null default false,
  add column if not exists trial_started_at        timestamptz,
  add column if not exists trial_ended_at          timestamptz,
  add column if not exists subscription_status     varchar default 'trial',
  add column if not exists subscription_started_at timestamptz,
  add column if not exists subscription_ends_at    timestamptz,
  add column if not exists last_payment_at         timestamptz,
  add column if not exists tokens_used_this_month  integer not null default 0,
  add column if not exists tokens_used_all_time    integer not null default 0,
  add column if not exists estimated_cost_usd      numeric not null default 0;

-- Create token_usage if not exists
create table if not exists public.token_usage (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references public.users(id) on delete cascade,
  action_id      uuid references public.actions(id) on delete set null,
  input_tokens   integer not null default 0,
  output_tokens  integer not null default 0,
  total_tokens   integer not null default 0,
  cost_usd       numeric not null default 0,
  action_type    varchar,
  model          varchar,
  created_at     timestamptz not null default now()
);

-- Create billing_records if not exists
create table if not exists public.billing_records (
  id                        bigint generated always as identity primary key,
  user_id                   uuid not null references public.users(id) on delete cascade,
  amount_usd                numeric not null default 0,
  payment_date              timestamptz,
  subscription_period_start timestamptz,
  subscription_period_end   timestamptz,
  status                    varchar,
  notes                     text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

*/

-- ============================================================
-- DONE
-- ============================================================
