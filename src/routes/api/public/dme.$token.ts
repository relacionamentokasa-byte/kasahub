import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { approveExtraDemand } from "@/lib/ops-api";

const getDme = createServerFn({ method: "GET" })
  .validator((token: string) => token)
  .handler(async ({ data: token }) => {
    // We use service role to bypass RLS since this is a public token based access
    // But since I don't have supabaseAdmin readily available in this context without secrets,
    // I will use the standard supabase client and rely on the token.
    // Actually, I'll check if the token matches.
    
    const { data: dme, error } = await supabase
      .from("extra_demands")
      .select(`
        *,
        clients (name, company, logo_url, brand_primary),
        contracts (title)
      `)
      .eq("public_token", token)
      .single();

    if (error || !dme) {
      throw new Error("Demanda não encontrada");
    }

    return dme;
  });

const publicApproveDme = createServerFn({ method: "POST" })
  .validator((token: string) => token)
  .handler(async ({ data: token }) => {
    const { data: dme, error } = await supabase
      .from("extra_demands")
      .select("id")
      .eq("public_token", token)
      .single();

    if (error || !dme) {
      throw new Error("Demanda não encontrada");
    }

    // Call the same logic used in the internal app
    return await approveExtraDemand(dme.id);
  });

export const Route = createFileRoute("/api/public/dme/$token")({
  loader: async ({ params }) => {
    return await getDme({ data: params.token });
  },
});
