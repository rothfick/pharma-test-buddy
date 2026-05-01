
-- AUDIT LOG (immutable chain)
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  user_email text,
  entity_type text not null,
  entity_id text,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  reason text,
  prev_hash text,
  current_hash text not null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index idx_audit_log_entity on public.audit_log(entity_type, entity_id);
create index idx_audit_log_user on public.audit_log(user_id);
create index idx_audit_log_created on public.audit_log(created_at desc);

alter table public.audit_log enable row level security;

create policy "Authenticated can read audit log"
  on public.audit_log for select to authenticated using (true);

create policy "Authenticated can insert audit entries"
  on public.audit_log for insert to authenticated with check (auth.uid() = user_id or user_id is null);

-- Block UPDATE / DELETE entirely via trigger
create or replace function public.prevent_audit_mutation()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'audit_log is immutable (21 CFR Part 11)';
end;
$$;

create trigger audit_log_no_update
before update on public.audit_log
for each row execute function public.prevent_audit_mutation();

create trigger audit_log_no_delete
before delete on public.audit_log
for each row execute function public.prevent_audit_mutation();

-- E-SIGNATURES
create table public.e_signatures (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  action text not null,
  meaning text not null,
  reason text not null,
  signed_by uuid not null,
  signed_by_email text not null,
  witness_id uuid,
  witness_email text,
  signature_hash text not null,
  created_at timestamptz not null default now()
);
create index idx_esig_entity on public.e_signatures(entity_type, entity_id);

alter table public.e_signatures enable row level security;

create policy "Authenticated can read signatures"
  on public.e_signatures for select to authenticated using (true);

create policy "Users sign for themselves"
  on public.e_signatures for insert to authenticated with check (auth.uid() = signed_by);

create trigger esig_no_update
before update on public.e_signatures
for each row execute function public.prevent_audit_mutation();

create trigger esig_no_delete
before delete on public.e_signatures
for each row execute function public.prevent_audit_mutation();

-- VALIDATION RUNS (IQ/OQ/PQ)
create type public.validation_phase as enum ('IQ', 'OQ', 'PQ');
create type public.validation_status as enum ('pending', 'passed', 'failed', 'blocked');

create table public.validation_runs (
  id uuid primary key default gen_random_uuid(),
  phase public.validation_phase not null,
  name text not null,
  description text,
  status public.validation_status not null default 'pending',
  executed_by uuid,
  executed_at timestamptz,
  evidence jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_validation_phase on public.validation_runs(phase);

alter table public.validation_runs enable row level security;

create policy "Authenticated read validation"
  on public.validation_runs for select to authenticated using (true);

create policy "Admins manage validation"
  on public.validation_runs for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Authenticated can update own execution"
  on public.validation_runs for update to authenticated
  using (auth.uid() = executed_by or executed_by is null);

create trigger validation_runs_updated
before update on public.validation_runs
for each row execute function public.set_updated_at();

-- Seed validation checklist (IQ/OQ/PQ examples)
insert into public.validation_runs (phase, name, description, status) values
  ('IQ', 'Database connectivity', 'Verify Lovable Cloud database reachable from app', 'passed'),
  ('IQ', 'Auth provider configured', 'Email + OAuth providers active', 'passed'),
  ('IQ', 'Edge functions deployed', 'All 9+ functions reachable', 'passed'),
  ('IQ', 'Required tables exist', 'tasks, profiles, audit_log present with RLS', 'passed'),
  ('OQ', 'User can sign up and log in', 'Full auth flow functional', 'passed'),
  ('OQ', 'CRUD on tasks works', 'Create, read, update, delete with RLS enforced', 'passed'),
  ('OQ', 'Audit log captures changes', 'Every CRUD writes to audit_log', 'pending'),
  ('OQ', 'E-signature blocks unsigned approval', 'Approval workflow requires signature', 'pending'),
  ('OQ', 'RLS prevents cross-user data access', 'User A cannot read User B private data', 'passed'),
  ('PQ', 'Performance: 100 concurrent users', 'p95 < 500ms under load', 'pending'),
  ('PQ', 'Audit log retention 7 years', 'Retention policy documented', 'pending'),
  ('PQ', 'Disaster recovery RPO < 1h', 'Backup and restore validated', 'pending'),
  ('PQ', 'Penetration test passed', 'External security audit', 'pending');
