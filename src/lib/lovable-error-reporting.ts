type LovableErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type LovableEvents = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: LovableErrorOptions,
  ) => void;
};

declare global {
  interface Window {
    __lovableEvents?: LovableEvents;
  }
}

import { supabase } from "@/integrations/supabase/client";

export async function reportLovableError(error: unknown, context: Record<string, unknown> = {}) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  
  console.error("[Lovable Error Reporting]:", { message, stack, context });

  // Persistence in local database
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const user_id = session?.user?.id;

    // We don't wait for the insert to complete to not block the UI
    supabase.from("error_logs").insert({
      message,
      stack,
      page_url: typeof window !== "undefined" ? window.location.href : "SSR",
      context: { 
        ...context,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "Unknown",
        timestamp: new Date().toISOString()
      } as any,
      user_id,
    }).then(({ error: insertError }) => {
      if (insertError) {
        console.warn("[Lovable Error Reporting] Database logging failed:", insertError.message);
      }
    });
  } catch (e) {
    console.error("[Lovable Error Reporting] Logging flow failed:", e);
  }

  if (typeof window === "undefined") return;
  window.__lovableEvents?.captureException?.(
    error,
    {
      source: "react_error_boundary",
      route: window.location.pathname,
      ...context,
    },
    {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error",
    },
  );
}
