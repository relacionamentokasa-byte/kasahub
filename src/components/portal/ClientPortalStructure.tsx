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

      <LaunchGridProgress clientId={clientId} />



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
