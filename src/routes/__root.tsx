import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  ClientOnly,
} from "@tanstack/react-router";

import { useEffect, useState, type ReactNode, Suspense, lazy } from "react";
import { fetchAgencySettings } from "@/lib/settings-api";
import { Toaster } from "sonner";
import { AlertTriangle } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { ThemeProvider, THEME_INIT_SCRIPT, useTheme } from "@/lib/theme";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import { registerPWA } from "@/lib/pwa-register";

const CookieConsent = lazy(() => import("@/components/CookieConsent").then(m => ({ default: m.CookieConsent })));


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  
  useEffect(() => {
    reportLovableError(error, { 
      boundary: "tanstack_root_error_component",
      componentStack: (error as any).componentStack,
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-surface border border-border p-8 rounded-2xl shadow-xl">
        <div className="flex justify-center mb-6">
          <div className="size-16 rounded-full bg-rose-500/10 flex items-center justify-center">
            <AlertTriangle className="size-8 text-rose-500" />
          </div>
        </div>
        
        <h1 className="text-xl font-bold tracking-tight text-foreground text-center">
          Ocorreu um erro ao carregar esta página
        </h1>
        <p className="mt-3 text-sm text-muted-foreground text-center leading-relaxed">
          Encontramos um problema ao processar esta informação. Nossa equipe já foi notificada.
        </p>

        <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border/50">
          <p className="text-[10px] font-mono uppercase tracking-wider text-foreground/40 mb-1">Detalhes técnicos:</p>
          <p className="text-xs font-mono text-rose-500/80 break-words line-clamp-3">
            {error.message || "Erro desconhecido"}
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
              window.location.reload();
            }}
            className="w-full inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
          >
            Tentar Novamente
          </button>
          <a
            href="/"
            className="w-full inline-flex items-center justify-center rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-muted active:scale-[0.98]"
          >
            Voltar para o Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#0C1618" },
      { title: "KASA HUB — Sistema Operacional para Agências" },
      { name: "description", content: "ERP especializado para agências de marketing. Comercial, operação, financeiro e experiência do cliente em um só lugar." },
      { name: "author", content: "Kasa Marketing Consultoria" },
      { property: "og:title", content: "KASA HUB — Sistema Operacional para Agências" },
      { property: "og:description", content: "ERP especializado para agências de marketing. Comercial, operação, financeiro e experiência do cliente em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "KASA HUB — Sistema Operacional para Agências" },
      { name: "twitter:description", content: "ERP especializado para agências de marketing. Comercial, operação, financeiro e experiência do cliente em um só lugar." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1045d35e-b9e6-4a0d-8042-3f74e3f3e902/id-preview-2f480550--621e80b6-8687-4e83-b76c-8896600eb296.lovable.app-1780622949249.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1045d35e-b9e6-4a0d-8042-3f74e3f3e902/id-preview-2f480550--621e80b6-8687-4e83-b76c-8896600eb296.lovable.app-1780622949249.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Funnel+Display:wght@300;400;500;600;700;800&family=Onest:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" },
      { rel: "manifest", href: "/api/public/manifest" },
      { rel: "icon", href: "https://fduofhsiahyxvlaxthhe.supabase.co/storage/v1/object/public/logos/logo-yellow.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "https://fduofhsiahyxvlaxthhe.supabase.co/storage/v1/object/public/logos/logo-yellow.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AudioNotificationManager() {
  useAudioNotifications();
  return null;
}

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster richColors position="top-right" theme={theme} />;
}

function AuthListener() {
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [router, queryClient]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const faviconUrl = "https://fduofhsiahyxvlaxthhe.supabase.co/storage/v1/object/public/logos/logo-yellow.png";

  useEffect(() => {
    registerPWA();
  }, []);

  useEffect(() => {
    // Atualiza o favicon dinamicamente no head
    const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (link) {
      link.href = faviconUrl;
    }
    const appleLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
    if (appleLink) {
      appleLink.href = faviconUrl;
    }
  }, [faviconUrl]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthListener />
        <ClientOnly fallback={null}><AudioNotificationManager /></ClientOnly>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}

        <Outlet />
        <Suspense fallback={null}><CookieConsent /></Suspense>
        <ThemedToaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

