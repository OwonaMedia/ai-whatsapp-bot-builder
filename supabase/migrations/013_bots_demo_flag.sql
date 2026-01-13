-- Add demo flag to bots for differentiating demo and real bots
alter table public.bots
  add column if not exists is_demo boolean not null default false;

-- Ensure existing PostgREST caches pick up the change when migration runs
select pg_notify('pgrst', 'reload schema');

