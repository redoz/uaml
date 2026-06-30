-- Version history for saved models. Every Save snapshots the graph here, so you
-- can browse, diff, and restore past versions — the "git for data models" story.
-- Versions are immutable (insert-only); deleting a model cascades its versions.

create table if not exists public.model_versions (
  id         uuid primary key default gen_random_uuid(),
  model_id   uuid not null references public.models (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  graph      jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists model_versions_model_created_idx
  on public.model_versions (model_id, created_at desc);

alter table public.model_versions enable row level security;

create policy "owner can read versions"   on public.model_versions for select using (auth.uid() = user_id);
create policy "owner can insert versions" on public.model_versions for insert with check (auth.uid() = user_id);
create policy "owner can delete versions" on public.model_versions for delete using (auth.uid() = user_id);
