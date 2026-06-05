import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Mail, Phone, Building2, FileText } from "lucide-react";
import { fetchClient, fetchProjects } from "@/lib/ops-api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { JobsBoard } from "@/components/jobs/JobsBoard";

export const Route = createFileRoute("/_authenticated/clientes/$clientId")({
  head: () => ({ meta: [{ title: "Cliente — KASA OS" }] }),
  component: ClientDetail,
});

function ClientDetail() {
  const { clientId } = useParams({ from: "/_authenticated/clientes/$clientId" });
  const { data: client } = useQuery({ queryKey: ["client", clientId], queryFn: () => fetchClient(clientId) });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", { clientId }],
    queryFn: () => fetchProjects({ clientId }),
  });

  if (!client) return <div className="p-10 text-foreground/40">Carregando…</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 lg:px-10 pt-6 pb-4">
        <Link
          to="/clientes"
          className="inline-flex items-center gap-1.5 text-xs text-foreground/50 hover:text-primary mb-4 font-mono uppercase tracking-wider"
        >
          <ArrowLeft className="size-3.5" /> Clientes
        </Link>
        <div className="flex items-start gap-4">
          <div
            className="size-16 rounded-2xl grid place-items-center font-display font-bold text-2xl shrink-0"
            style={{ background: `${client.brand_primary}22`, color: client.brand_primary ?? "#FFBC45" }}
          >
            {(client.company || client.name).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <span className="text-primary text-[10px] font-mono uppercase tracking-[0.25em]">
              Cliente · 360°
            </span>
            <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight">
              {client.company || client.name}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-foreground/50">
              {client.email && <span className="inline-flex items-center gap-1.5"><Mail className="size-3" />{client.email}</span>}
              {client.phone && <span className="inline-flex items-center gap-1.5"><Phone className="size-3" />{client.phone}</span>}
              {client.document && <span className="inline-flex items-center gap-1.5"><Building2 className="size-3" />{client.document}</span>}
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="flex-1 flex flex-col">
        <div className="px-6 lg:px-10 border-b border-border">
          <TabsList className="bg-transparent border-0 h-auto p-0 gap-1">
            {["overview", "projects", "jobs", "proposals", "finance", "files"].map((v) => (
              <TabsTrigger
                key={v}
                value={v}
                className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-3 py-2.5 text-xs uppercase font-mono tracking-wider"
              >
                {{
                  overview: "Visão geral",
                  projects: "Projetos",
                  jobs: "Jobs",
                  proposals: "Propostas",
                  finance: "Financeiro",
                  files: "Arquivos",
                }[v]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="flex-1 overflow-y-auto px-6 lg:px-10 py-6 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card label="Projetos ativos" value={projects.filter((p) => p.status === "active").length} />
            <Card label="Total de projetos" value={projects.length} />
            <Card label="Status" value={client.status === "active" ? "Ativo" : client.status} />
          </div>
          {client.notes && (
            <div className="mt-6 bg-surface border border-border rounded-2xl p-5">
              <div className="text-[10px] uppercase tracking-widest text-foreground/50 font-mono mb-2 flex items-center gap-1.5">
                <FileText className="size-3" /> Observações
              </div>
              <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="projects" className="flex-1 overflow-y-auto px-6 lg:px-10 py-6 mt-0">
          {projects.length === 0 ? (
            <p className="text-foreground/40 text-sm">Nenhum projeto para este cliente.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((p) => (
                <Link
                  key={p.id}
                  to="/projetos/$projectId"
                  params={{ projectId: p.id }}
                  className="bg-surface border border-border rounded-2xl p-5 hover:border-primary/50 transition"
                >
                  <div className="font-display font-semibold mb-1">{p.name}</div>
                  {p.due_date && (
                    <div className="text-xs text-foreground/50 inline-flex items-center gap-1.5">
                      <Calendar className="size-3" /> {p.due_date}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="jobs" className="flex-1 mt-0 min-h-0">
          <JobsBoard clientId={clientId} title="Jobs do cliente" eyebrow="Cliente · Jobs" />
        </TabsContent>

        <TabsContent value="proposals" className="px-6 lg:px-10 py-6 mt-0 text-foreground/40">
          Em breve.
        </TabsContent>
        <TabsContent value="finance" className="px-6 lg:px-10 py-6 mt-0 text-foreground/40">
          Em breve.
        </TabsContent>
        <TabsContent value="files" className="px-6 lg:px-10 py-6 mt-0 text-foreground/40">
          Em breve.
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <div className="text-[10px] uppercase tracking-widest text-foreground/50 font-mono mb-2">{label}</div>
      <div className="font-display text-3xl font-bold tracking-tight">{value}</div>
    </div>
  );
}
