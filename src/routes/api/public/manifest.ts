import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/manifest")({
  server: {
    handlers: {
      GET: async () => {
        const { data } = await supabaseAdmin
          .from("agency_settings")
          .select(
            "name, pwa_name, pwa_short_name, pwa_description, pwa_theme_color, pwa_background_color, pwa_icon_192_url, pwa_icon_512_url",
          )
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        const a = (data ?? {}) as Record<string, string | null>;
        const icon512 = a.pwa_icon_512_url || "/icon-512.png";
        const icon192 = a.pwa_icon_192_url || icon512;

        const manifest = {
          name: a.pwa_name || a.name || "KASA HUB",
          short_name: a.pwa_short_name || "KASA",
          description:
            a.pwa_description ||
            "Plataforma de gestão operacional, comercial e financeira.",
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "portrait",
          background_color: a.pwa_background_color || "#0C1618",
          theme_color: a.pwa_theme_color || "#0C1618",
          lang: "pt-BR",
          icons: [
            { src: icon192, sizes: "192x192", type: "image/png", purpose: "any" },
            { src: icon512, sizes: "512x512", type: "image/png", purpose: "any" },
            { src: icon512, sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        };

        return new Response(JSON.stringify(manifest), {
          status: 200,
          headers: {
            "Content-Type": "application/manifest+json; charset=utf-8",
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
