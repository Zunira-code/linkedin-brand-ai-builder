-- Revoke public execute on SECURITY DEFINER helper functions and grant narrowly.

-- Trigger-only functions: no anon/authenticated execute needed.
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- has_role is used inside RLS policies evaluated as the authenticated role,
-- so keep execute for authenticated + service_role only. Anonymous callers
-- have no reason to invoke it.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
