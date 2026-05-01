
create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  description text,
  nodes jsonb not null default '[]'::jsonb,
  edges jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workflows enable row level security;

create policy "Users read own workflows or admin"
  on public.workflows for select to authenticated
  using (auth.uid() = user_id or has_role(auth.uid(), 'admin'::app_role));

create policy "Users insert own workflows"
  on public.workflows for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own workflows or admin"
  on public.workflows for update to authenticated
  using (auth.uid() = user_id or has_role(auth.uid(), 'admin'::app_role));

create policy "Users delete own workflows or admin"
  on public.workflows for delete to authenticated
  using (auth.uid() = user_id or has_role(auth.uid(), 'admin'::app_role));

create trigger workflows_set_updated_at
  before update on public.workflows
  for each row execute function public.set_updated_at();

create table public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  user_id uuid,
  status text not null default 'running',
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  steps jsonb not null default '[]'::jsonb,
  duration_ms integer,
  total_cost_usd numeric not null default 0,
  total_tokens integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workflow_runs enable row level security;

create policy "Users read own workflow runs or admin"
  on public.workflow_runs for select to authenticated
  using (auth.uid() = user_id or has_role(auth.uid(), 'admin'::app_role));

create policy "Users insert own workflow runs"
  on public.workflow_runs for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own workflow runs"
  on public.workflow_runs for update to authenticated
  using (auth.uid() = user_id or has_role(auth.uid(), 'admin'::app_role));

create trigger workflow_runs_set_updated_at
  before update on public.workflow_runs
  for each row execute function public.set_updated_at();

create index idx_workflow_runs_workflow on public.workflow_runs(workflow_id, created_at desc);
