import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // 1. Bypass check if returning from Google OAuth so Supabase can process the URL code
    if (
      location.href.includes("code=") ||
      location.href.includes("access_token=") ||
      location.href.includes("error=")
    ) {
      return;
    }

    // 2. Check local session
    const { data: sessionData } = await supabase.auth.getSession();

    if (sessionData?.session?.user) {
      return { user: sessionData.session.user };
    }

    // 3. Fallback check for active user
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      throw redirect({ to: "/auth" });
    }

    return { user: data.user };
  },
  component: () => <Outlet />,
});
