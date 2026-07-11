ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS first_comment TEXT,
  ADD COLUMN IF NOT EXISTS first_comment_scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_comment_posted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_comment_urn TEXT,
  ADD COLUMN IF NOT EXISTS first_comment_error TEXT;

CREATE INDEX IF NOT EXISTS posts_first_comment_due_idx
  ON public.posts (first_comment_scheduled_at)
  WHERE first_comment IS NOT NULL
    AND first_comment_posted_at IS NULL
    AND status = 'posted';