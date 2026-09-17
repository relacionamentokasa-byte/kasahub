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
import { StorageImage } from "@/components/ui/storage-image";

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

  if (projectLoading) return <DetailHeaderSkeleton />;
  if (!project) return <div className="p-10 text-center">Projeto não encontrado.</div>;

  return (
    <div className="flex flex-col h-full animate-reveal">
      <div className="px-5 lg:px-8 py-4 bg-card border-b border-border/60">
        <Link
          to="/projetos"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 font-mono-kasa"
        >
          <ArrowLeft className="size-3.5" /> Projetos
        </Link>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className="size-9 rounded-md flex items-center justify-center border border-border/60 shrink-0"
              style={{
                background: `${project.color ?? "#FFBC45"}15`,
                color: project.color ?? "#FFBC45",
              }}
            >
              <LayoutDashboard className="size-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-mono-kasa tracking-wider text-muted-foreground block">
                Projeto
              </span>
              <h1 className="font-display text-lg lg:text-xl font-bold tracking-tight text-foreground truncate">
                {project.name}
              </h1>
              {client && (
                <p className="text-xs text-muted-foreground font-mono-kasa mt-0.5 flex items-center gap-1.5 truncate">
                  {(client as any).logo_url ? (
                    <StorageImage
                      src={(client as any).logo_url}
                      alt={client.company || client.name || ""}
                      className="size-3.5 rounded object-cover"
                    />
                  ) : (
                    <CheckCircle2 className="size-3" />
                  )}
                  {client.company || client.name}
                </p>
              )}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
            className="h-8 px-3 text-xs font-mono-kasa gap-1.5 rounded-md border-border/60 shrink-0"
          >
            <Pencil className="size-3.5" /> Editar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="board" className="flex-1 flex flex-col">
        <div className="px-5 lg:px-8 border-b border-border/60 bg-card">
          <TabsList className="bg-transparent border-0 h-auto p-0 gap-6">
            <TabsTrigger
              value="board"
              className="relative data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-foreground border-b-2 border-transparent rounded-none px-0 py-3 text-xs font-mono-kasa font-medium tracking-tight gap-1.5 transition-colors hover:text-foreground text-muted-foreground shadow-none"
            >
              Jobs
            </TabsTrigger>
            <TabsTrigger
              value="timeline"
              className="relative data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-foreground border-b-2 border-transparent rounded-none px-0 py-3 text-xs font-mono-kasa font-medium tracking-tight gap-1.5 transition-colors hover:text-foreground text-muted-foreground shadow-none"
            >
              Timeline
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="board" className="flex-1 mt-0 min-h-0">
          <JobsBoard projectId={projectId} title="Jobs do Projeto" />
        </TabsContent>

        <TabsContent value="timeline" className="p-5 lg:p-8 max-w-4xl">
          <ClientTimeline projectId={projectId} />
        </TabsContent>
      </Tabs>

      <EditProjectDialog project={project as any} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}
