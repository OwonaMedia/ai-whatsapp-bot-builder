-- ============================================
-- SUPPORT TICKETING TABLES & POLICIES
-- ============================================

create extension if not exists "pgcrypto";

-- --------------------------------------------
-- TABLE: support_tickets
-- --------------------------------------------
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  category text,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'new' check (status in ('new','investigating','waiting_customer','resolved','closed')),
  title text not null,
  description text not null,
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_tickets_user_fk foreign key (user_id) references auth.users (id) on delete cascade
);

create index if not exists support_tickets_user_idx on public.support_tickets (user_id);

create or replace function public.update_support_tickets_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trigger_update_support_tickets_updated_at on public.support_tickets;
create trigger trigger_update_support_tickets_updated_at
  before update on public.support_tickets
  for each row
  execute function public.update_support_tickets_updated_at();

alter table public.support_tickets enable row level security;

create policy "Users can manage own tickets"
  on public.support_tickets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Service role can manage all tickets"
  on public.support_tickets
  for all
  using ((auth.jwt() ->> 'role') = 'service_role')
  with check (true);

-- --------------------------------------------
-- TABLE: support_ticket_messages
-- --------------------------------------------
create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  author_type text not null check (author_type in ('customer','support','system')),
  author_user_id uuid,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists support_ticket_messages_ticket_idx on public.support_ticket_messages (ticket_id);

alter table public.support_ticket_messages enable row level security;

create policy "Users can read own ticket messages"
  on public.support_ticket_messages
  for select
  using (
    exists (
      select 1
      from public.support_tickets st
      where st.id = support_ticket_messages.ticket_id
        and st.user_id = auth.uid()
    )
  );

create policy "Users can insert messages on own tickets"
  on public.support_ticket_messages
  for insert
  with check (
    author_type = 'customer'
    and author_user_id = auth.uid()
    and exists (
      select 1
      from public.support_tickets st
      where st.id = support_ticket_messages.ticket_id
        and st.user_id = auth.uid()
    )
  );

create policy "Service role can manage all ticket messages"
  on public.support_ticket_messages
  for all
  using ((auth.jwt() ->> 'role') = 'service_role')
  with check (true);

-- --------------------------------------------
-- TABLE: support_automation_events
-- --------------------------------------------
create table if not exists public.support_automation_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  action_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists support_automation_events_ticket_idx on public.support_automation_events (ticket_id);

alter table public.support_automation_events enable row level security;

create policy "Service role manages automation events"
  on public.support_automation_events
  for all
  using ((auth.jwt() ->> 'role') = 'service_role')
  with check (true);

create policy "Users can view own automation events"
  on public.support_automation_events
  for select
  using (
    exists (
      select 1
      from public.support_tickets st
      where st.id = support_automation_events.ticket_id
        and st.user_id = auth.uid()
    )
  );

-- --------------------------------------------
-- FUNCTION: create_support_ticket
-- --------------------------------------------
create or replace function public.create_support_ticket(
  _title text,
  _description text,
  _category text default null,
  _source_metadata jsonb default '{}'::jsonb,
  _attachments jsonb default '[]'::jsonb,
  _priority text default 'normal'
)
returns public.support_tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  created_ticket public.support_tickets;
begin
  insert into public.support_tickets (user_id, category, title, description, priority, source_metadata)
  values (auth.uid(), _category, _title, _description, coalesce(_priority, 'normal'), coalesce(_source_metadata, '{}'::jsonb))
  returning * into created_ticket;

  insert into public.support_ticket_messages (ticket_id, author_type, author_user_id, message, metadata)
  values (
    created_ticket.id,
    'customer',
    auth.uid(),
    _description,
    jsonb_build_object('attachments', coalesce(_attachments, '[]'::jsonb))
  );

  return created_ticket;
end;
$$;

grant execute on function public.create_support_ticket(text, text, text, jsonb, jsonb, text) to authenticated, service_role;

-- --------------------------------------------
-- CLEANUP EXISTING POLICIES IF NECESSARY
-- (No-op if policies already exist)
-- --------------------------------------------
-- (Policies use CREATE POLICY without IF NOT EXISTS; rerunning migration will fail which is desired)


