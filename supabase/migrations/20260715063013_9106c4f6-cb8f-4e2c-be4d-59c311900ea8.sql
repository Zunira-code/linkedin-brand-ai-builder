
CREATE OR REPLACE FUNCTION public.admin_get_user_id_by_email(_email text)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT id INTO uid FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  RETURN uid;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_user_id_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_user_id_by_email(text) TO authenticated, service_role;
