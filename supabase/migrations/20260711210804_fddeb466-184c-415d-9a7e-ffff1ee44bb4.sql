
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS brand_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS brand_primary_color TEXT,
  ADD COLUMN IF NOT EXISTS brand_secondary_color TEXT,
  ADD COLUMN IF NOT EXISTS brand_accent_color TEXT;

CREATE TABLE IF NOT EXISTS public.carousels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled carousel',
  template TEXT NOT NULL DEFAULT 'bold',
  slides JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  linkedin_urn TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.carousels TO authenticated;
GRANT ALL ON public.carousels TO service_role;

ALTER TABLE public.carousels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own carousels"
  ON public.carousels FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER carousels_set_updated_at
  BEFORE UPDATE ON public.carousels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS carousels_user_id_created_at_idx
  ON public.carousels (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS carousels_scheduled_idx
  ON public.carousels (status, scheduled_at) WHERE status = 'scheduled';
