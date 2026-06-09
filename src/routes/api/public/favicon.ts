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

        const faviconUrl = "https://fduofhsiahyxvlaxthhe.supabase.co/storage/v1/object/public/logos/logo-yellow.png";
        
        return Response.redirect(faviconUrl, 302);
      },
    },
  },
});
