
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_urn TEXT NOT NULL,
  name TEXT,
  headline TEXT,
  profile_url TEXT,
  avatar_url TEXT,
  comment_count INTEGER NOT NULL DEFAULT 0,
  last_comment_at TIMESTAMPTZ,
  last_comment_text TEXT,
  status TEXT NOT NULL DEFAULT 'not_contacted',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, person_urn)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own leads" ON public.leads FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX leads_user_last_idx ON public.leads (user_id, last_comment_at DESC);

CREATE TABLE public.lead_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  post_urn TEXT NOT NULL,
  comment_urn TEXT NOT NULL,
  comment_text TEXT,
  commented_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, comment_urn)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_comments TO authenticated;
GRANT ALL ON public.lead_comments TO service_role;
ALTER TABLE public.lead_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own lead_comments" ON public.lead_comments FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX lead_comments_lead_idx ON public.lead_comments (lead_id, commented_at DESC);
