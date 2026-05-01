-- Enable pgvector
create extension if not exists vector;

-- ===== llm_traces =====
create table public.llm_traces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  feature text not null,
  model text not null,
  prompt_tokens int not null default 0,
  completion_tokens int not null default 0,
  total_tokens int generated always as (prompt_tokens + completion_tokens) stored,
  cost_usd numeric(10,6) not null default 0,
  latency_ms int not null default 0,
  cache_hit boolean not null default false,
  status text not null default 'success',
  error text,
  request_preview text,
  response_preview text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_llm_traces_user on public.llm_traces(user_id, created_at desc);
create index idx_llm_traces_feature on public.llm_traces(feature, created_at desc);
alter table public.llm_traces enable row level security;

create policy "Users see own traces or admin sees all"
  on public.llm_traces for select to authenticated
  using (auth.uid() = user_id or has_role(auth.uid(), 'admin'));
create policy "Authenticated can insert traces"
  on public.llm_traces for insert to authenticated
  with check (auth.uid() = user_id or user_id is null);

-- ===== prompt_registry =====
create table public.prompt_registry (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version int not null,
  content text not null,
  description text,
  is_active boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, version)
);
create index idx_prompt_registry_active on public.prompt_registry(name) where is_active;
alter table public.prompt_registry enable row level security;

create policy "Authenticated can read prompts"
  on public.prompt_registry for select to authenticated using (true);
create policy "Admins can insert prompts"
  on public.prompt_registry for insert to authenticated
  with check (has_role(auth.uid(), 'admin'));
create policy "Admins can update prompts"
  on public.prompt_registry for update to authenticated
  using (has_role(auth.uid(), 'admin'));
create policy "Admins can delete prompts"
  on public.prompt_registry for delete to authenticated
  using (has_role(auth.uid(), 'admin'));

create trigger trg_prompt_registry_updated
  before update on public.prompt_registry
  for each row execute function public.set_updated_at();

-- ===== prompt_evals =====
create table public.prompt_evals (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid references public.prompt_registry(id) on delete cascade,
  dataset_name text not null,
  model text not null,
  score numeric(5,4) not null,
  total_cases int not null default 0,
  passed_cases int not null default 0,
  avg_latency_ms int not null default 0,
  total_cost_usd numeric(10,6) not null default 0,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.prompt_evals enable row level security;

create policy "Authenticated can read evals"
  on public.prompt_evals for select to authenticated using (true);
create policy "Admins can manage evals"
  on public.prompt_evals for all to authenticated
  using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));

-- ===== agent_runs =====
create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  goal text not null,
  status text not null default 'running',
  total_cost_usd numeric(10,6) not null default 0,
  total_tokens int not null default 0,
  duration_ms int,
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_agent_runs_user on public.agent_runs(user_id, created_at desc);
alter table public.agent_runs enable row level security;

create policy "Users see own agent runs or admin all"
  on public.agent_runs for select to authenticated
  using (auth.uid() = user_id or has_role(auth.uid(), 'admin'));
create policy "Users insert own agent runs"
  on public.agent_runs for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users update own agent runs"
  on public.agent_runs for update to authenticated
  using (auth.uid() = user_id);

create trigger trg_agent_runs_updated
  before update on public.agent_runs
  for each row execute function public.set_updated_at();

-- ===== agent_steps =====
create table public.agent_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  step_index int not null,
  agent_role text not null,
  tool_name text,
  input jsonb,
  output jsonb,
  reasoning text,
  duration_ms int,
  tokens int default 0,
  created_at timestamptz not null default now()
);
create index idx_agent_steps_run on public.agent_steps(run_id, step_index);
alter table public.agent_steps enable row level security;

create policy "Users see steps of own runs or admin"
  on public.agent_steps for select to authenticated
  using (
    exists (select 1 from public.agent_runs r where r.id = run_id
      and (r.user_id = auth.uid() or has_role(auth.uid(), 'admin')))
  );
create policy "Users insert steps for own runs"
  on public.agent_steps for insert to authenticated
  with check (
    exists (select 1 from public.agent_runs r where r.id = run_id and r.user_id = auth.uid())
  );

-- ===== rag_documents =====
create table public.rag_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text not null,
  source text,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.rag_documents enable row level security;

create policy "Authenticated can read docs"
  on public.rag_documents for select to authenticated using (true);
create policy "Authenticated can insert docs"
  on public.rag_documents for insert to authenticated
  with check (auth.uid() = user_id or user_id is null);
create policy "Owner or admin delete docs"
  on public.rag_documents for delete to authenticated
  using (auth.uid() = user_id or has_role(auth.uid(), 'admin'));

-- ===== rag_chunks =====
create table public.rag_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.rag_documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(768),
  created_at timestamptz not null default now()
);
create index idx_rag_chunks_doc on public.rag_chunks(document_id);
create index idx_rag_chunks_embedding on public.rag_chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);
alter table public.rag_chunks enable row level security;

create policy "Authenticated can read chunks"
  on public.rag_chunks for select to authenticated using (true);
create policy "Authenticated can insert chunks"
  on public.rag_chunks for insert to authenticated with check (true);

-- ===== semantic_cache =====
create table public.semantic_cache (
  id uuid primary key default gen_random_uuid(),
  feature text not null,
  model text not null,
  prompt_text text not null,
  prompt_embedding vector(768),
  response text not null,
  hit_count int not null default 0,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);
create index idx_semantic_cache_embedding on public.semantic_cache
  using ivfflat (prompt_embedding vector_cosine_ops) with (lists = 100);
create index idx_semantic_cache_expiry on public.semantic_cache(expires_at);
alter table public.semantic_cache enable row level security;

create policy "Authenticated can read cache"
  on public.semantic_cache for select to authenticated using (true);
create policy "Authenticated can write cache"
  on public.semantic_cache for insert to authenticated with check (true);
create policy "Authenticated can update cache hits"
  on public.semantic_cache for update to authenticated using (true);

-- ===== similarity search RPC =====
create or replace function public.match_rag_chunks(
  query_embedding vector(768),
  match_count int default 5,
  filter_doc_ids uuid[] default null
)
returns table (
  chunk_id uuid,
  document_id uuid,
  content text,
  similarity float
)
language sql stable security definer set search_path = public
as $$
  select c.id, c.document_id, c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.rag_chunks c
  where c.embedding is not null
    and (filter_doc_ids is null or c.document_id = any(filter_doc_ids))
  order by c.embedding <=> query_embedding
  limit match_count
$$;

create or replace function public.match_semantic_cache(
  query_embedding vector(768),
  feature_filter text,
  similarity_threshold float default 0.95
)
returns table (
  id uuid,
  response text,
  similarity float
)
language sql stable security definer set search_path = public
as $$
  select c.id, c.response,
    1 - (c.prompt_embedding <=> query_embedding) as similarity
  from public.semantic_cache c
  where c.feature = feature_filter
    and c.expires_at > now()
    and c.prompt_embedding is not null
    and 1 - (c.prompt_embedding <=> query_embedding) >= similarity_threshold
  order by c.prompt_embedding <=> query_embedding
  limit 1
$$;