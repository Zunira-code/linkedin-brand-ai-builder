CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
          NEW.raw_user_meta_data->>'avatar_url')
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) = 'zunirayusuf94@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.profiles p
   SET is_approved = true, subscription_tier = 'agency'
FROM auth.users u
WHERE u.id = p.id AND lower(u.email) = 'zunirayusuf94@gmail.com';