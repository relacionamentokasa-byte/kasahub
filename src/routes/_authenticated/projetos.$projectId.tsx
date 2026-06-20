import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil, CheckCircle2, LayoutDashboard, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchProject, fetchClient, fetchJobs } from "@/lib/ops-api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { JobsBoard } from "@/components/jobs/JobsBoard";
import { Button } from "@/components/ui/button";
import { EditProjectDialog } from "@/components/projects/EditProjectDialog";
import { ClientTimeline } from "@/components/clients/ClientTimeline";
import { DetailHeaderSkeleton } from "@/components/ui/loading-skeletons";

export const Route = createFileRoute("/_authenticated/projetos/$projectId")({
  head: () => ({ meta: [{ title: "Projeto — KASA HUB" }] }),
  component: ProjectDetail,
});

function ProjectDetail() {
  const { projectId } = useParams({ from: "/_authenticated/projetos/$projectId" });
  const [editOpen, setEditOpen] = useState(false);

  const { data: project, isLoading: projectLoading, error: projectError } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      try {
        return await fetchProject(projectId);
      } catch (err) {
        console.error("Error fetching project details:", err);
        throw err;
      }
    },
  });

  const { data: client } = useQuery({
    queryKey: ["client", project?.client_id],
    queryFn: () => fetchClient(project?.client_id as string),
    enabled: !!project?.client_id,
  });

  if (projectLoading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
  if (!project) return <div className="p-10 text-center">Projeto não encontrado.</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 lg:px-10 pt-6 pb-6 bg-surface border-b border-border">
        <Link to="/projetos" className="inline-flex items-center gap-1.5 text-xs text-foreground/40 hover:text-primary mb-4 uppercase">
          <ArrowLeft className="size-3" /> Voltar
        </Link>
        
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-5">
            <div className="size-14 rounded-2xl flex items-center justify-center border border-border" style={{ background: `${project.color ?? "#FFBC45"}15`, color: project.color ?? "#FFBC45" }}>
              <LayoutDashboard className="size-7" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight">{project.name}</h1>
              {client && (
                <p className="text-xs text-foreground/50 mt-1 flex items-center gap-1.5">
                  {(client as any).logo_url ? (
                    <img src={(client as any).logo_url} alt={client.company || client.name || ""} className="size-4 rounded object-cover" />
                  ) : (
                    <CheckCircle2 className="size-3" />
                  )}
                  {client.company || client.name}
                </p>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-2">
            <Pencil className="size-3.5" /> Editar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="board" className="flex-1 flex flex-col">
        <div className="px-6 lg:px-10 border-b border-border bg-surface">
          <TabsList className="bg-transparent border-0 h-auto p-0 gap-6">
            <TabsTrigger value="board" className="py-4 text-xs font-bold uppercase">Jobs</TabsTrigger>
            <TabsTrigger value="timeline" className="py-4 text-xs font-bold uppercase">Timeline</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="board" className="flex-1 mt-0 min-h-0">
          <JobsBoard projectId={projectId} title="Jobs do Projeto" />
        </TabsContent>

        <TabsContent value="timeline" className="p-6">
          <ClientTimeline projectId={projectId} />
        </TabsContent>
      </Tabs>

      <EditProjectDialog project={project as any} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}
