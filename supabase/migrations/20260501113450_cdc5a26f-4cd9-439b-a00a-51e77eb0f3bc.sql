-- Chaos engineering experiments
CREATE TABLE public.chaos_experiments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  experiment_type TEXT NOT NULL, -- 'latency', 'error_injection', 'slow_query', 'memory_pressure', 'random_failure'
  target TEXT NOT NULL, -- which service/endpoint
  hypothesis TEXT, -- "system should remain available with p95 < 2s"
  blast_radius TEXT NOT NULL DEFAULT 'small', -- 'small', 'medium', 'large'
  abort_condition TEXT, -- "error_rate > 50%"
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb, -- experiment-specific config
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'aborted', 'passed', 'failed'
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  observations JSONB NOT NULL DEFAULT '{}'::jsonb,
  conclusion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chaos_experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own chaos experiments or admin"
  ON public.chaos_experiments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own chaos experiments"
  ON public.chaos_experiments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own chaos experiments or admin"
  ON public.chaos_experiments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER chaos_experiments_updated_at
  BEFORE UPDATE ON public.chaos_experiments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Performance test runs
CREATE TABLE public.perf_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  scenario_name TEXT NOT NULL,
  target_url TEXT NOT NULL,
  load_profile TEXT NOT NULL, -- 'smoke', 'load', 'stress', 'spike', 'soak'
  vus INTEGER NOT NULL DEFAULT 1, -- virtual users (concurrency)
  duration_seconds INTEGER NOT NULL DEFAULT 10,
  total_requests INTEGER NOT NULL DEFAULT 0,
  successful_requests INTEGER NOT NULL DEFAULT 0,
  failed_requests INTEGER NOT NULL DEFAULT 0,
  rps NUMERIC NOT NULL DEFAULT 0,
  p50_ms INTEGER NOT NULL DEFAULT 0,
  p95_ms INTEGER NOT NULL DEFAULT 0,
  p99_ms INTEGER NOT NULL DEFAULT 0,
  max_ms INTEGER NOT NULL DEFAULT 0,
  min_ms INTEGER NOT NULL DEFAULT 0,
  error_rate NUMERIC NOT NULL DEFAULT 0,
  raw_samples JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of latency samples for chart
  status TEXT NOT NULL DEFAULT 'running',
  slo_passed BOOLEAN,
  slo_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

ALTER TABLE public.perf_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own perf runs or admin"
  ON public.perf_runs FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own perf runs"
  ON public.perf_runs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own perf runs or admin"
  ON public.perf_runs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- SLO definitions
CREATE TABLE public.slo_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  service TEXT NOT NULL DEFAULT 'main',
  metric TEXT NOT NULL, -- 'availability', 'latency_p95', 'latency_p99', 'error_rate'
  target_value NUMERIC NOT NULL, -- e.g. 99.9 for availability, 500 for latency_p95 ms
  comparator TEXT NOT NULL DEFAULT 'lte', -- 'lte', 'gte'
  window_days INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.slo_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read SLOs"
  ON public.slo_definitions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage SLOs"
  ON public.slo_definitions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER slo_definitions_updated_at
  BEFORE UPDATE ON public.slo_definitions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed default SLOs
INSERT INTO public.slo_definitions (name, description, service, metric, target_value, comparator) VALUES
  ('API Availability', 'Production API uptime target', 'main', 'availability', 99.9, 'gte'),
  ('API Latency p95', 'Read endpoints under 500ms p95', 'main', 'latency_p95', 500, 'lte'),
  ('API Latency p99', 'Read endpoints under 1500ms p99', 'main', 'latency_p99', 1500, 'lte'),
  ('Error Budget', 'Error rate under 0.1%', 'main', 'error_rate', 0.1, 'lte');

CREATE INDEX idx_perf_runs_created ON public.perf_runs(created_at DESC);
CREATE INDEX idx_chaos_created ON public.chaos_experiments(created_at DESC);
