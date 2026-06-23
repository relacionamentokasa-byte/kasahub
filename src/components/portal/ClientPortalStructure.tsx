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

const STAGE_COLOR_MAP: Record<string, string> = {
  "text-blue-500": "#3B82F6",
  "text-amber-500": "#F59E0B",
  "text-yellow-500": "#EAB308",
  "text-orange-500": "#F97316",
  "text-purple-500": "#A855F7",
  "text-emerald-500": "#10B981",
  "text-green-500": "#22C55E",
  "text-rose-500": "#F43F5E",
  "text-red-500": "#EF4444",
  "text-slate-500": "#64748B",
  "text-gray-500": "#6B7280",
};

function resolveStageColor(color?: string | null) {
  if (!color) return "#64748B";
  const clean = color.trim();
  if (clean.startsWith("#") || clean.startsWith("rgb") || clean.startsWith("hsl") || clean.startsWith("var(")) return clean;
  return STAGE_COLOR_MAP[clean] || "#64748B";
}

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
  const unmatchedProducts = products.filter((p) => !p.status_id || !stageMap.has(p.status_id));
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
                <span className="size-2 rounded-full" style={{ background: resolveStageColor(s.color) }} />
                <span className="text-xs font-medium">{s.label}</span>
                <span className="text-[10px] text-foreground/40">{s.count}</span>
              </div>
              {i < stageCounts.length - 1 && <span className="text-foreground/20">→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Products gallery */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map((p) => {
          const st = p.status_id ? stageMap.get(p.status_id)?.stage : null;
          const stColor = resolveStageColor(st?.color);
          const pct = productProgress(p.status_id);
          const productJobs = jobs.filter((j) => j.launch_product_id === p.id);
          return (
            <div key={p.id} className="bg-surface border border-border rounded-2xl overflow-hidden flex flex-col hover:border-primary/30 hover:shadow-md transition shadow-sm">
              <div className="aspect-square bg-white overflow-hidden flex items-center justify-center border-b border-border">
                {p.image_url ? (
                  <StorageImage src={p.image_url} alt={p.name} className="w-full h-full object-contain" />
                ) : (
                  <Rocket className="size-10 text-foreground/20" />
                )}
              </div>
              <div className="p-3 space-y-2 flex-1 flex flex-col">
                <div className="font-semibold text-sm leading-tight line-clamp-2">{p.name}</div>
                <div className="flex items-center justify-between gap-2">
                  {st ? (
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{ background: `${stColor}20`, color: stColor }}
                    >
                      <span className="size-1.5 rounded-full" style={{ background: stColor }} />
                      {st.label}
                    </span>
                  ) : <span className="text-[10px] text-foreground/40">Sem etapa</span>}
                  <span className="text-[10px] font-bold text-foreground/60">{pct}%</span>
                </div>
                <Progress value={pct} className="h-1" />
                {p.due_date && (
                  <div className="text-[10px] text-foreground/40 flex items-center gap-1">
                    <Clock className="size-3" /> {format(new Date(p.due_date), "dd/MM/yyyy")}
                  </div>
                )}

                {productJobs.length > 0 && (
                  <div className="pt-2 mt-auto border-t border-border space-y-1">
                    <h4 className="text-[9px] font-bold uppercase tracking-wider text-foreground/40">
                      Jobs ({productJobs.length})
                    </h4>
                    {productJobs.slice(0, 4).map((job) => {
                      const jobStage = job.stage_id ? stageMap.get(job.stage_id)?.stage : null;
                      const jobStageColor = resolveStageColor(jobStage?.color);
                      const isDone = jobStage?.is_done || job.status === "done" || !!job.done_at;
                      return (
                        <div key={job.id} className="flex items-center justify-between gap-1.5 text-[11px]">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            {isDone ? (
                              <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                            ) : job.status === "in_progress" ? (
                              <Clock className="size-3 text-amber-500 shrink-0" />
                            ) : (
                              <Circle className="size-3 text-foreground/20 shrink-0" />
                            )}
                            <span className="truncate">{job.title}</span>
                          </div>
                          {jobStage && (
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0"
                              style={{ background: `${jobStageColor}20`, color: jobStageColor }}
                            >
                              {jobStage.label}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {productJobs.length > 4 && (
                      <div className="text-[9px] text-foreground/40">+{productJobs.length - 4} jobs</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {unmatchedProducts.length > 0 && null}
      </div>
    </section>
  );
}

