import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppTopbar } from "@/components/AppTopbar";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { FloatingActions } from "@/components/FloatingActions";
import { GlobalChatWidget } from "@/components/GlobalChatWidget";
import { PresenceProvider } from "@/contexts/PresenceContext";
import { FocusModeProvider, useFocusMode } from "@/contexts/FocusModeContext";
import { PrivacyProvider } from "@/contexts/PrivacyContext";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SplashScreen } from "@/components/SplashScreen";

const SPLASH_KEY = "kasa:splash-seen";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Explicitly allow public routes if for some reason they hit this layout
    const publicPrefixes = ["/p/", "/proposta/", "/proposal/", "/approve/", "/dme/", "/auth", "/api/public/", "/lovable/"];
    if (publicPrefixes.some(prefix => location.pathname.startsWith(prefix))) {
      return;
    }

    // Use getSession() — reads from local storage instantly and never hangs on the network.
    // Falls back with a 3s timeout safety net just in case the auth client is wedged.
    const sessionPromise = supabase.auth.getSession();
    const timeout = new Promise<{ data: { session: null }; error: null }>((resolve) =>
      setTimeout(() => resolve({ data: { session: null }, error: null }), 3000),
    );
    const { data } = (await Promise.race([sessionPromise, timeout])) as Awaited<typeof sessionPromise>;

    if (!data.session?.user) {
      throw redirect({ to: "/auth" });
    }
    return { user: data.session.user };
  },
  component: ShellLayout,
});

function ShellLayout() {
  const { user } = Route.useRouteContext();
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem(SPLASH_KEY);
  });

  useEffect(() => {
    if (!user?.id) return;
    // Only log once per browser session to avoid hammering the DB on every
    // shell mount (which happens on every route change inside _authenticated).
    const sessionKey = `kasa:access-logged:${user.id}`;
    if (typeof window === "undefined" || sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, "1");

    supabase
      .from("profiles")
      .update({ last_access: new Date().toISOString() })
      .eq("id", user.id)
      .then(() => {
        supabase.from("access_logs").insert({
          user_id: user.id,
          action: "login",
          metadata: { user_agent: navigator.userAgent }
        }).then(() => {});
      });
  }, [user?.id]);

  const handleSplashDone = () => {
    sessionStorage.setItem(SPLASH_KEY, "1");
    setShowSplash(false);
  };

  return (
    <PresenceProvider userId={user?.id}>
      <FocusModeProvider>
        <PrivacyProvider>
          <SidebarProvider>
            <ShellInner />
            {showSplash && user?.id && (
              <SplashScreen userId={user.id} onDone={handleSplashDone} />
            )}
          </SidebarProvider>
        </PrivacyProvider>
      </FocusModeProvider>
    </PresenceProvider>
  );
}

function ShellInner() {
  const { focusMode } = useFocusMode();
  return (
    <div className="min-h-screen flex w-full bg-background text-foreground relative">
      {!focusMode && <AppSidebar />}
      <div className="flex-1 flex flex-col min-w-0">
        {!focusMode && <AppTopbar />}
        {!focusMode && <Breadcrumbs />}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
      {!focusMode && <OnboardingWizard />}
      {!focusMode && <FloatingActions />}
      {!focusMode && <GlobalChatWidget />}
    </div>
  );
}

