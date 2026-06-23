import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchProjects, fetchJobs, fetchChecklist, type JobStage } from "@/lib/ops-api";
import { listProductsByClient, listStatusesByClient } from "@/lib/launch-grids-api";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Clock, FileText, Rocket } from "lucide-react";
import { ClientOnboardingPortalView } from "@/components/onboarding/ClientOnboardingPanel";
import { StorageImage } from "@/components/ui/storage-image";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ClientPortalStructure() {
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    async function getSession() {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        // Find if this user is a client
        const { data: portalUser } = await supabase
          .from("client_portal_users")
          .select("client_id")
          .eq("auth_user_id", data.user.id)
          .maybeSingle();
        
        if (portalUser) {
          setClientId(portalUser.client_id);
        } else {
          // Fallback to user metadata
          const cid = data.user.user_metadata?.portal_client_id;
          if (cid) setClientId(cid);
        }
      }
    }
    getSession();
  }, []);

  const { data: projects = [] } = useQuery({
    queryKey: ["client-portal-projects", clientId],
    queryFn: () => fetchProjects({ clientId: clientId! }),
    enabled: !!clientId,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["client-portal-jobs", clientId],
    queryFn: () => fetchJobs({ clientId: clientId! }),
    enabled: !!clientId,
  });

  if (!clientId) return null;

  return (
    <div className="space-y-10 p-6 lg:p-10 max-w-7xl mx-auto">
      <ClientOnboardingPortalView clientId={clientId} />

      <LaunchGridProgress clientId={clientId} jobs={jobs} />



      <div>
        <h1 className="text-3xl font-display font-bold">Meus Projetos</h1>
        <p className="text-foreground/50 mt-1">Acompanhe o progresso das suas demandas em tempo real.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => {
          const projectJobs = jobs.filter(j => j.project_id === project.id);
          const doneJobs = projectJobs.filter(j => j.status === 'done' || !!j.done_at);
          const progress = projectJobs.length > 0 ? Math.round((doneJobs.length / projectJobs.length) * 100) : 0;

          return (
            <div key={project.id} className="bg-surface border border-border rounded-2xl p-5 hover:border-primary/30 transition shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <h3 className="font-display font-bold text-xl truncate">{project.name}</h3>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                  project.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-foreground/40'
                }`}>
                  {project.status === 'active' ? 'Ativo' : 'Encerrado'}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-foreground/50">
                  <span>Progresso Geral</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="pt-4 border-t border-border space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-foreground/30">Jobs em andamento</h4>
                <div className="space-y-2">
                  {projectJobs.slice(0, 3).map((job) => (
                    <div key={job.id} className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-2 truncate">
                        {job.status === 'done' ? (
                          <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                        ) : job.status === 'in_progress' ? (
                          <Clock className="size-4 text-amber-500 shrink-0" />
                        ) : (
                          <Circle className="size-4 text-foreground/20 shrink-0" />
                        )}
                        <span className="truncate">{job.title}</span>
                      </div>
                      <span className="text-[10px] text-foreground/40 shrink-0">
                        {(job as any).progress_percentage || 0}%
                      </span>
                    </div>
                  ))}
                  {projectJobs.length > 3 && (
                    <p className="text-[10px] text-center text-primary hover:underline cursor-pointer">Ver todos os {projectJobs.length} jobs</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LaunchGridProgress({ clientId, jobs }: { clientId: string; jobs: any[] }) {
  const { data: statuses = [] } = useQuery({
    queryKey: ["portal-launch-statuses", clientId],
    queryFn: () => listStatusesByClient(clientId),
  });
  const { data: products = [] } = useQuery({
    queryKey: ["portal-launch-products", clientId],
    queryFn: () => listProductsByClient(clientId),
  });

  if (products.length === 0 || statuses.length === 0) return null;

  const ordered = [...statuses].sort((a, b) => a.order_index - b.order_index);
  const stageMap = new Map(ordered.map((s, i) => [s.id, { stage: s, index: i }]));
  const total = ordered.length;

  const productProgress = (statusId: string | null) => {
    if (!statusId) return 0;
    const found = stageMap.get(statusId);
    if (!found) return 0;
    if (found.stage.is_done) return 100;
    return Math.round(((found.index + 1) / total) * 100);
  };

  const stageCounts = ordered.map((s) => ({
    ...s,
    count: products.filter((p) => p.status_id === s.id).length,
  }));
  const doneCount = products.filter((p) => {
    const f = p.status_id ? stageMap.get(p.status_id) : null;
    return f?.stage.is_done;
  }).length;
  const overall = Math.round((doneCount / products.length) * 100);

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-display font-bold flex items-center gap-2">
            <Rocket className="size-5 text-primary" /> Grid de Lançamento
          </h2>
          <p className="text-foreground/50 mt-1 text-sm">Acompanhe o progresso de cada produto pelas etapas do lançamento.</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-foreground/50">Concluídos</div>
          <div className="text-lg font-bold">{doneCount}/{products.length} <span className="text-foreground/40 text-sm">({overall}%)</span></div>
        </div>
      </div>

      {/* Stage pipeline */}
      <div className="bg-surface border border-border rounded-2xl p-4">
        <div className="flex items-center gap-2 flex-wrap">
          {stageCounts.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-background">
                <span className="size-2 rounded-full" style={{ background: s.color }} />
                <span className="text-xs font-medium">{s.label}</span>
                <span className="text-[10px] text-foreground/40">{s.count}</span>
              </div>
              {i < stageCounts.length - 1 && <span className="text-foreground/20">→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Products */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p) => {
          const st = p.status_id ? stageMap.get(p.status_id)?.stage : null;
          const pct = productProgress(p.status_id);
          return (
            <div key={p.id} className="bg-surface border border-border rounded-2xl p-4 space-y-3 hover:border-primary/30 transition shadow-sm">
              <div className="flex items-start gap-3">
                <div className="size-14 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                  {p.image_url ? (
                    <StorageImage src={p.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Rocket className="size-5 text-foreground/30" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{p.name}</div>
                  {st && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="size-2 rounded-full" style={{ background: st.color }} />
                      <span className="text-xs text-foreground/60">{st.label}</span>
                    </div>
                  )}
                  {p.due_date && (
                    <div className="text-[10px] text-foreground/40 mt-0.5">
                      Previsto: {format(new Date(p.due_date), "dd/MM/yyyy")}
                    </div>
                  )}
                </div>
                <div className="text-xs font-bold text-foreground/60">{pct}%</div>
              </div>
              <Progress value={pct} className="h-1.5" />
            </div>
          );
        })}
      </div>
    </section>
  );
}

