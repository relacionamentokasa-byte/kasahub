import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppTopbar } from "@/components/AppTopbar";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { FloatingActions } from "@/components/FloatingActions";
import { GlobalChatWidget } from "@/components/GlobalChatWidget";
import { usePresence } from "@/hooks/use-presence";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    
    // Explicitly allow public routes if for some reason they hit this layout
    const publicPrefixes = ["/p/", "/proposta/", "/proposal/", "/approve/", "/dme/", "/auth", "/api/public/", "/lovable/"];
    if (publicPrefixes.some(prefix => location.pathname.startsWith(prefix))) {
      return;
    }

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: ShellLayout,
});

function ShellLayout() {
  const { user } = Route.useRouteContext();

  // Mantém o usuário online durante toda a sessão autenticada,
  // independentemente de qual tela ele esteja visualizando.
  usePresence(user?.id);


  
  useEffect(() => {
    if (user?.id) {
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
    }
  }, [user?.id]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground relative">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppTopbar />
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
        <OnboardingWizard />
        <FloatingActions />
        <GlobalChatWidget />
      </div>
    </SidebarProvider>
  );
}
