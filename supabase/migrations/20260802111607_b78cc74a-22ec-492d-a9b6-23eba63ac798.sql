CREATE TABLE public.profile_kit_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('headline','about','featured','banner_tagline')),
  title text,
  content text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_kit_items TO authenticated;
GRANT ALL ON public.profile_kit_items TO service_role;
ALTER TABLE public.profile_kit_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own profile kit items" ON public.profile_kit_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER profile_kit_items_updated_at BEFORE UPDATE ON public.profile_kit_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX profile_kit_items_user_kind_idx ON public.profile_kit_items (user_id, kind, created_at DESC);