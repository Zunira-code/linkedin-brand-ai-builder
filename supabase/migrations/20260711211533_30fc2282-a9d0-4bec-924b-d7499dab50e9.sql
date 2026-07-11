ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS brand_font TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS carousel_id UUID REFERENCES public.carousels(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS posts_carousel_idx ON public.posts(carousel_id);