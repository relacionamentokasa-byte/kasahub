import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/favicon")({
  server: {
    handlers: {
      GET: async () => {
        const { data } = await supabaseAdmin
          .from("agency_settings")
          .select("pwa_favicon_url")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        const faviconUrl = data?.pwa_favicon_url || "/icon-512.png";
        
        return Response.redirect(faviconUrl, 302);
      },
    },
  },
});
