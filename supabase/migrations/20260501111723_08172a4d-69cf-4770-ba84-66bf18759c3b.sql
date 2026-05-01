
-- DORA Four Keys daily metrics
CREATE TABLE public.dora_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_date DATE NOT NULL,
  environment TEXT NOT NULL DEFAULT 'production',
  service TEXT NOT NULL DEFAULT 'main',
  deployment_count INTEGER NOT NULL DEFAULT 0,
  lead_time_minutes INTEGER NOT NULL DEFAULT 0,
  change_failure_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  mttr_minutes INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (metric_date, environment, service)
);

ALTER TABLE public.dora_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read dora" ON public.dora_metrics
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert dora" ON public.dora_metrics
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin update dora" ON public.dora_metrics
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_dora_date ON public.dora_metrics (metric_date DESC);

-- Test runs from CI
CREATE TABLE public.test_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_type TEXT NOT NULL CHECK (run_type IN ('unit', 'integration', 'e2e', 'perf', 'a11y')),
  suite_name TEXT NOT NULL,
  branch TEXT,
  commit_sha TEXT,
  ci_provider TEXT,
  pipeline_url TEXT,
  total INTEGER NOT NULL DEFAULT 0,
  passed INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  flaky INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'cancelled')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.test_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read test_runs" ON public.test_runs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert test_runs" ON public.test_runs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_test_runs_created ON public.test_runs (created_at DESC);
CREATE INDEX idx_test_runs_type ON public.test_runs (run_type);

-- Flaky tests registry
CREATE TABLE public.flaky_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_name TEXT NOT NULL,
  suite_name TEXT NOT NULL,
  failure_count INTEGER NOT NULL DEFAULT 1,
  total_runs INTEGER NOT NULL DEFAULT 1,
  last_failed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  root_cause TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'fixed', 'wontfix')),
  owner TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (test_name, suite_name)
);

ALTER TABLE public.flaky_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read flaky" ON public.flaky_tests
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert flaky" ON public.flaky_tests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update flaky" ON public.flaky_tests
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_flaky_updated_at
  BEFORE UPDATE ON public.flaky_tests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Coverage snapshots
CREATE TABLE public.coverage_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commit_sha TEXT,
  branch TEXT,
  line_coverage NUMERIC(5,2) NOT NULL DEFAULT 0,
  branch_coverage NUMERIC(5,2) NOT NULL DEFAULT 0,
  statement_coverage NUMERIC(5,2) NOT NULL DEFAULT 0,
  function_coverage NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_lines INTEGER NOT NULL DEFAULT 0,
  covered_lines INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coverage_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read coverage" ON public.coverage_snapshots
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert coverage" ON public.coverage_snapshots
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_coverage_created ON public.coverage_snapshots (created_at DESC);
