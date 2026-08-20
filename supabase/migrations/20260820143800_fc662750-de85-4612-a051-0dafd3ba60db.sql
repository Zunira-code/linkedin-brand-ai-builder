ALTER TABLE public.profiles ALTER COLUMN is_approved SET DEFAULT true;
UPDATE public.profiles SET is_approved = true WHERE is_approved IS DISTINCT FROM true;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, is_approved)
  VALUES (NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
          NEW.raw_user_meta_data->>'avatar_url',
          true)
  ON CONFLICT (id) DO NOTHING;

  IF lower(COALESCE(NEW.email, '')) = 'zunirayusuf94@gmail.com' THEN
    UPDATE public.profiles
       SET is_approved = true, subscription_tier = 'agency'
     WHERE id = NEW.id;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;