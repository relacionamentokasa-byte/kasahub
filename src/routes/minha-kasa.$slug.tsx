import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClientUnifiedPortal } from "@/components/portal/ClientUnifiedPortal";

export const Route = createFileRoute("/minha-kasa/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Minha Kasa — ${params.slug}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MinhaKasaPage,
});

function MinhaKasaPage() {
  const { slug } = Route.useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["minha-kasa", slug],
    queryFn: async () => {
      // 1. Tenta buscar da API pública
      try {
        const res = await fetch(`/api/public/portal-jobs/${slug}`, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (json?.client) return json;
        }
      } catch (e) {
        // segue para consulta direta cliente autenticado
      }

      // 2. Consulta direta via cliente Supabase (usando a sessão do usuário caso esteja logado)
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
        let q = supabase
          .from("clients")
          .select("id, name, company, logo_url, brand_primary, brand_secondary, portal_cover_url, portal_primary_color, portal_cover_color, portal_enabled, has_launch_grid, created_at, portal_slug");

        if (isUuid) {
          q = q.or(`portal_slug.eq.${slug},id.eq.${slug}`);
        } else {
          q = q.eq("portal_slug", slug);
        }

        let { data: clientData } = await q.maybeSingle();

        if (!clientData) {
          const { data: byName } = await supabase
            .from("clients")
            .select("id, name, company, logo_url, brand_primary, brand_secondary, portal_cover_url, portal_primary_color, portal_cover_color, portal_enabled, has_launch_grid, created_at, portal_slug")
            .or(`portal_slug.ilike.${slug},name.ilike.%${slug}%,company.ilike.%${slug}%`)
            .maybeSingle();
          if (byName) clientData = byName;
        }

        if (clientData) {
          const [jobsRes, approvalsRes, eventsRes] = await Promise.all([
            supabase
              .from("jobs")
              .select("id, title, description, status, stage_id, due_date, progress_percentage, completed_steps, total_steps, done_at, updated_at, main_responsible_id, priority, launch_product_id")
              .eq("client_id", clientData.id)
              .eq("show_in_portal", true)
              .order("updated_at", { ascending: false }),

            (supabase as any)
              .from("approval_items")
              .select("id, title, description, content_type, content_url, content_text, caption, thumbnail_url, status, feedback, sent_for_approval_at, viewed_at, approved_at, rejected_at, created_at, job_id, format, slides, slide_statuses")
              .eq("client_id", clientData.id)
              .neq("status", "archived")
              .order("created_at", { ascending: false }),

            supabase
              .from("calendar_events")
              .select("id, title, starts_at, ends_at, kind, description")
              .eq("client_id", clientData.id)
              .gte("starts_at", new Date().toISOString())
              .order("starts_at", { ascending: true })
              .limit(10),
          ]);

          return {
            client: clientData,
            jobs: jobsRes.data || [],
            approvalItems: approvalsRes.data || [],
            events: eventsRes.data || [],
          };
        }
      } catch (e) {
        // segue para erro/fallback
      }

      return null;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="text-slate-600 text-sm font-medium animate-pulse">Carregando portal do cliente...</div>
      </div>
    );
  }

  if (error || !data?.client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-6">
        <div className="text-center max-w-md space-y-3">
          <div className="text-5xl mb-2">🔒</div>
          <h1 className="text-2xl font-bold text-slate-900">Portal não encontrado</h1>
          <p className="text-slate-600 text-xs leading-relaxed">
            Não encontramos um cliente ativo com o identificador <code className="font-mono text-slate-800 font-semibold">{slug}</code>. Verifique o link recebido pela Kasa Marketing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClientUnifiedPortal
      slug={slug}
      client={data.client}
      jobs={data.jobs || []}
      approvalItems={data.approvalItems || []}
      events={data.events || []}
    />
  );
}
