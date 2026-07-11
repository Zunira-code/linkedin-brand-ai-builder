CREATE TABLE public.voice_samples (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  source text NOT NULL DEFAULT 'paste',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_samples TO authenticated;
GRANT ALL ON public.voice_samples TO service_role;

ALTER TABLE public.voice_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own voice samples all"
  ON public.voice_samples
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX voice_samples_user_id_created_at_idx
  ON public.voice_samples (user_id, created_at DESC);