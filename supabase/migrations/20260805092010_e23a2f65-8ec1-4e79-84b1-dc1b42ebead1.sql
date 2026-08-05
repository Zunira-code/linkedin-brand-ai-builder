UPDATE public.profiles p SET is_approved = true, subscription_tier = 'agency'
WHERE EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role = 'admin');