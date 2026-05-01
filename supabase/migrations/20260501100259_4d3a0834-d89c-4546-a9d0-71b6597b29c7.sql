create table public.feature_budgets (
  id uuid primary key default gen_random_uuid(),
  feature text not null unique,
  daily_limit_usd numeric not null default 1.0,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.feature_budgets enable row level security;

create policy "Signed-in users can read budgets"
  on public.feature_budgets for select to authenticated
  using (auth.uid() is not null);

create policy "Admins can manage budgets"
  on public.feature_budgets for all to authenticated
  using (has_role(auth.uid(), 'admin'))
  with check (has_role(auth.uid(), 'admin'));

create trigger feature_budgets_updated_at
  before update on public.feature_budgets
  for each row execute function public.set_updated_at();

-- helper: today's spend per feature (UTC day)
create or replace function public.feature_spend_today(_feature text)
returns numeric
language sql stable security definer set search_path to 'public'
as $$
  select coalesce(sum(cost_usd), 0)
  from public.llm_traces
  where feature = _feature
    and created_at >= date_trunc('day', now() at time zone 'utc');
$$;

-- seed sensible defaults so the page isn't empty
insert into public.feature_budgets (feature, daily_limit_usd) values
  ('prompt-playground', 0.50),
  ('agent-crew', 1.00),
  ('rag-query', 0.25),
  ('test-generator', 0.25),
  ('bug-triage', 0.25)
on conflict (feature) do nothing;