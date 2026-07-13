
-- 1) linkedin_connections
CREATE TABLE public.linkedin_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  linkedin_profile_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.linkedin_connections TO authenticated;
GRANT ALL ON public.linkedin_connections TO service_role;
ALTER TABLE public.linkedin_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own linkedin_connections" ON public.linkedin_connections
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_linkedin_connections_updated
  BEFORE UPDATE ON public.linkedin_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) linkedin_daily_metrics
CREATE TABLE public.linkedin_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  profile_views INTEGER NOT NULL DEFAULT 0,
  post_impressions INTEGER NOT NULL DEFAULT 0,
  followers INTEGER NOT NULL DEFAULT 0,
  followers_gained INTEGER NOT NULL DEFAULT 0,
  engagement_rate NUMERIC(6,3) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, metric_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.linkedin_daily_metrics TO authenticated;
GRANT ALL ON public.linkedin_daily_metrics TO service_role;
ALTER TABLE public.linkedin_daily_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own linkedin_daily_metrics" ON public.linkedin_daily_metrics
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_linkedin_daily_metrics_user_date
  ON public.linkedin_daily_metrics (user_id, metric_date DESC);
CREATE TRIGGER trg_linkedin_daily_metrics_updated
  BEFORE UPDATE ON public.linkedin_daily_metrics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) linkedin_posts_metrics
CREATE TABLE public.linkedin_posts_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_urn TEXT NOT NULL,
  content TEXT,
  impressions INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  reactions INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_urn)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.linkedin_posts_metrics TO authenticated;
GRANT ALL ON public.linkedin_posts_metrics TO service_role;
ALTER TABLE public.linkedin_posts_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own linkedin_posts_metrics" ON public.linkedin_posts_metrics
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_linkedin_posts_metrics_user_impressions
  ON public.linkedin_posts_metrics (user_id, impressions DESC);
CREATE TRIGGER trg_linkedin_posts_metrics_updated
  BEFORE UPDATE ON public.linkedin_posts_metrics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
