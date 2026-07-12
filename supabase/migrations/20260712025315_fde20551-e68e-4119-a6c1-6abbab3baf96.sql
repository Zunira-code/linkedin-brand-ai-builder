DO $$ BEGIN
  CREATE TYPE public.subscription_tier AS ENUM ('starter','growth','agency');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_tier public.subscription_tier NOT NULL DEFAULT 'starter';