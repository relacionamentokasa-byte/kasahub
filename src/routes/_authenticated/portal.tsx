import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { KasaPortalShell } from "@/components/portal/KasaPortalShell";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal")({
  head: () => ({ meta: [{ title: "Portal do Cliente — Kasa Marketing & Consultoria" }] }),
  component: AuthenticatedPortalPage,
});

function AuthenticatedPortalPage() {
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    async function getSession() {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const { data: portalUser } = await supabase
          .from("client_portal_users")
          .select("client_id")
          .eq("auth_user_id", data.user.id)
          .maybeSingle();

        if (portalUser) {
          setClientId(portalUser.client_id);
        } else {
          const cid = data.user.user_metadata?.portal_client_id;
          if (cid) setClientId(cid);
          else {
            // Fallback: se for admin/equipe testando, pega o primeiro cliente
            const { data: firstClient } = await supabase
              .from("clients")
              .select("id")
              .limit(1)
              .maybeSingle();
            if (firstClient) setClientId(firstClient.id);
          }
        }
      }
    }
    getSession();
  }, []);

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ["portal-client-info", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, company, logo_url, created_at, portal_slug")
        .eq("id", clientId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["portal-client-jobs", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, description, status, due_date, progress_percentage, updated_at")
        .eq("client_id", clientId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const { data: approvalItems = [] } = useQuery({
    queryKey: ["portal-client-approvals", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_items")
        .select("id, title, status, content_type, content_url, created_at")
        .eq("client_id", clientId!)
        .neq("status", "archived");
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["portal-client-events", clientId],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("calendar_events")
        .select("id, title, starts_at, ends_at, kind, description")
        .eq("client_id", clientId!)
        .gte("starts_at", nowIso)
        .order("starts_at", { ascending: true })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  if (clientLoading || (!client && clientId)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F5] text-[#0C1618]">
        <Loader2 className="size-8 animate-spin text-[#FFBC45] mb-2" />
        <p className="text-xs font-bold uppercase tracking-wider text-[#6A787B] font-mono-kasa">
          Carregando portal do cliente…
        </p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] p-6 text-[#0C1618]">
        <div className="bg-white border border-[#E9E4DC] rounded-2xl p-8 max-w-md text-center space-y-4 shadow-sm">
          <div className="size-12 rounded-xl bg-[#FFF4E0] text-[#FFBC45] font-display font-black text-xl flex items-center justify-center mx-auto">
            K
          </div>
          <h2 className="font-display font-bold text-xl text-[#0C1618]">Nenhum cliente vinculado</h2>
          <p className="text-xs text-[#6A787B] leading-relaxed">
            Sua conta de usuário não possui uma empresa associada no momento. Entre em contato com a equipe Kasa.
          </p>
        </div>
      </div>
    );
  }

  return (
    <KasaPortalShell
      client={client}
      jobs={jobs}
      approvalItems={approvalItems}
      events={events}
    />
  );
}
