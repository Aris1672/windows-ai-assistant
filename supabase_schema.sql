-- ============================================================
-- Windows AI Assistant — Supabase Schema
-- Run this in full in the Supabase SQL Editor
-- ============================================================


-- ============================================================
-- EXTENSIONS
-- ============================================================

create extension if not exists "uuid-ossp";


-- ============================================================
-- USERS
-- Mirrors auth.users; stores profile and subscription info.
-- ============================================================

create table public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  display_name  text,
  role          text not null default 'user' check (role in ('user', 'admin')),
  tier          text not null default 'free' check (tier in ('free', 'pro', 'enterprise')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Auto-create a users row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
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


-- ============================================================
-- INSTRUCTIONS  (Layer 2)
-- Persistent behavioural rules per user.
-- Optional context_app / context_folder make them conditional.
-- ============================================================

create table public.instructions (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.users(id) on delete cascade,
  label            text not null,                -- e.g. "Formal tone"
  instruction_text text not null,                -- sent to Claude
  context_app      text,                         -- e.g. "Microsoft Excel" — null = always active
  context_folder   text,                         -- e.g. "C:/Work/Invoices" — null = always active
  is_active        boolean not null default true,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_instructions_user_id on public.instructions(user_id);
create index idx_instructions_user_active on public.instructions(user_id, is_active);

create trigger instructions_updated_at
  before update on public.instructions
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- SKILLS  (Layer 3)
-- Reusable named actions. Surfaced in the command palette
-- when context_app / context_folder match the active context.
-- ============================================================

create table public.skills (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.users(id) on delete cascade,
  name             text not null,                -- e.g. "Prepare meeting summary"
  description      text,                         -- shown in palette
  prompt           text not null,                -- the instruction sent to Claude when skill fires
  context_app      text,                         -- only surface when this app is active
  context_folder   text,                         -- only surface in this folder
  is_destructive   boolean not null default false, -- true = require confirmation before executing
  is_active        boolean not null default true,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_skills_user_id on public.skills(user_id);
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
  title            text,                         -- auto-generated summary (future)
  context_app      text,                         -- active app when conversation started
  context_folder   text,                         -- active folder when conversation started
  context_text     text,                         -- selected text when conversation started
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_conversations_user_id on public.conversations(user_id);
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
create index idx_messages_user_id on public.messages(user_id);


-- ============================================================
-- ACTIONS
-- Log of every skill execution and action taken.
-- Used for history view and future workflow learning.
-- ============================================================

create table public.actions (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.users(id) on delete cascade,
  conversation_id  uuid references public.conversations(id) on delete set null,
  skill_id         uuid references public.skills(id) on delete set null,
  action_type      text not null,                -- e.g. "skill", "freeform", "builtin"
  action_label     text not null,                -- human-readable label
  context_app      text,
  context_folder   text,
  context_text     text,
  status           text not null default 'completed' check (status in ('completed', 'confirmed', 'cancelled', 'failed')),
  created_at       timestamptz not null default now()
);

create index idx_actions_user_id on public.actions(user_id);
create index idx_actions_user_created on public.actions(user_id, created_at desc);


-- ============================================================
-- ROW LEVEL SECURITY
-- Users can only access their own data.
-- Admin role bypasses all RLS.
-- ============================================================

alter table public.users         enable row level security;
alter table public.instructions  enable row level security;
alter table public.skills        enable row level security;
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;
alter table public.actions       enable row level security;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
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

create policy "Admins can view all users"
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


-- ============================================================
-- SEED: DEFAULT INSTRUCTIONS + SKILLS FOR NEW USERS
-- Called after a new user is created via the trigger below.
-- ============================================================

create or replace function public.seed_defaults_for_user(p_user_id uuid)
returns void language plpgsql security definer as $$
begin

  -- Default instructions (Layer 2)
  insert into public.instructions (user_id, label, instruction_text, sort_order) values
    (p_user_id, 'Concise responses',   'Keep all responses concise and to the point. Avoid unnecessary padding.', 0),
    (p_user_id, 'Friendly tone',       'Use a friendly, professional tone in all responses.', 1);

  -- Default skills (Layer 3) — no context conditions, available everywhere
  insert into public.skills (user_id, name, description, prompt, sort_order) values
    (p_user_id, 'Summarize',           'Summarize the selected text',          'Summarize the following text clearly and concisely:\n\n{{selected_text}}', 0),
    (p_user_id, 'Rewrite professionally', 'Rewrite selected text in a professional tone', 'Rewrite the following text in a clear, professional tone:\n\n{{selected_text}}', 1),
    (p_user_id, 'Explain this',        'Explain the selected text or code',    'Explain the following in plain language:\n\n{{selected_text}}', 2),
    (p_user_id, 'Fix grammar',         'Fix grammar and spelling errors',       'Fix all grammar and spelling errors in the following text. Return only the corrected text:\n\n{{selected_text}}', 3);

end;
$$;

-- Extend the new user trigger to also seed defaults
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  perform public.seed_defaults_for_user(new.id);
  return new;
end;
$$;


-- ============================================================
-- DONE
-- ============================================================
