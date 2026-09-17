import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TopNavigation } from "@/components/TopNavigation";
import { MobileBottomNavigation } from "@/components/MobileBottomNavigation";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { FloatingActions } from "@/components/FloatingActions";
import { PushNotificationPrompt } from "@/components/notifications/PushNotificationPrompt";

import { PresenceProvider } from "@/contexts/PresenceContext";
import { FocusModeProvider, useFocusMode } from "@/contexts/FocusModeContext";
import { PrivacyProvider } from "@/contexts/PrivacyContext";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Explicitly allow public routes if for some reason they hit this layout
    const publicPrefixes = ["/p/", "/proposta/", "/proposal/", "/approve/", "/dme/", "/auth", "/api/public/", "/lovable/"];
    if (publicPrefixes.some(prefix => location.pathname.startsWith(prefix))) {
      return;
    }

    // Use getSession() — reads from local storage instantly and never hangs on the network.
    // Falls back with a 5s timeout safety net if auth takes long on mobile / slow connection.
    let user = null;
    try {
      const sessionPromise = supabase.auth.getSession();
      const timeout = new Promise<{ data: { session: null }; error: null }>((resolve) =>
        setTimeout(() => resolve({ data: { session: null }, error: null }), 5000),
      );
      const res = (await Promise.race([sessionPromise, timeout])) as Awaited<typeof sessionPromise>;
      user = res?.data?.session?.user || null;
    } catch {
      user = null;
    }

    if (!user) {
      // Se um cliente sem login tentar acessar a URL interna da proposta por engano (/propostas/$id),
      // busca o token público da proposta e redireciona direto para a visualização pública.
      const proposalMatch = location.pathname.match(/^\/propostas\/([a-zA-Z0-9_-]+)/);
      if (proposalMatch && proposalMatch[1]) {
        try {
          const proposalId = proposalMatch[1];
          const { data: prop } = await supabase
            .from("proposals")
            .select("public_token")
            .eq("id", proposalId)
            .maybeSingle();

          if (prop?.public_token) {
            throw redirect({ to: "/proposta/$token", params: { token: prop.public_token } });
          }
        } catch (err) {
          if ((err as any)?.to || (err as any)?.status === 307 || (err as any)?.status === 302) {
            throw err;
          }
        }
      }

      throw redirect({ to: "/auth" });
    }
    return { user };
  },
  component: ShellLayout,
});

function ShellLayout() {
  const { user } = Route.useRouteContext() as { user?: { id?: string } };

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

  return (
    <PresenceProvider userId={user?.id}>
      <FocusModeProvider>
        <PrivacyProvider>
          <SidebarProvider>
            <ShellInner />
          </SidebarProvider>
        </PrivacyProvider>
      </FocusModeProvider>
    </PresenceProvider>
  );
}

function ShellInner() {
  const { focusMode } = useFocusMode();
  return (
    <div className="min-h-screen flex flex-col w-full bg-background text-foreground relative">
      {!focusMode && <TopNavigation />}
      <div className="flex-1 flex flex-col min-w-0 w-full pb-16 lg:pb-0">
        <main className="flex-1 min-w-0 w-full">
          <Outlet />
        </main>
      </div>
      {!focusMode && <MobileBottomNavigation />}
      {!focusMode && <OnboardingWizard />}
      {!focusMode && <FloatingActions />}
      {!focusMode && <PushNotificationPrompt />}
    </div>
  );
}

