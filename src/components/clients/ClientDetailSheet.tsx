import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { fetchClient, fetchJobs, fetchProjects } from "@/lib/ops-api";
import { FolderKanban, CheckSquare, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { fetchProfiles } from "@/lib/profile-api";
import { StorageImage } from "@/components/ui/storage-image";

export function ClientDetailSheet({
  clientId,
  open,
  onOpenChange,
}: {
  clientId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-5xl p-0 overflow-hidden flex flex-col bg-background"
      >
        {clientId && (
          <div className="flex-1 overflow-y-auto">
            <QuickPreview clientId={clientId} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function QuickPreview({ clientId }: { clientId: string }) {
  const navigate = useNavigate();
  const { data: client } = useQuery({ queryKey: ["client", clientId], queryFn: () => fetchClient(clientId) });
  const { data: projects = [] } = useQuery({ queryKey: ["projects", { clientId }], queryFn: () => fetchProjects({ clientId }) });
  const { data: jobs = [] } = useQuery({ queryKey: ["jobs", { clientId }], queryFn: () => fetchJobs({ clientId }) });
  const { data: profiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });

  if (!client) return null;

  const pendingJobs = jobs.filter((j: any) => !j.done_at).length;
  const responsible = profiles.find(p => p.id === (client as any).responsible_id);

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="p-6 border-b border-border bg-background/50">
        <div className="flex items-center gap-4 mb-4">
          <div
            className="size-16 rounded-2xl grid place-items-center font-display font-bold text-2xl overflow-hidden shrink-0 border border-border"
            style={{ background: `${client.brand_primary}22`, color: client.brand_primary ?? "#FFBC45" }}
          >
            {client.logo_url ? (
              <StorageImage src={client.logo_url} alt="" className="size-full object-cover" />
            ) : (
              (client.company || client.name).charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl font-bold truncate">{client.company || client.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={client.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : ""}>
                {client.status === "active" ? "Ativo" : client.status}
              </Badge>
              {responsible && (
                <div className="flex items-center gap-1.5 text-[10px] text-foreground/50 uppercase font-bold tracking-wider">
                  <User className="size-3" /> {responsible.display_name || responsible.full_name}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={() => navigate({ to: `/clientes/${clientId}` as any })} className="w-full gap-2">
            <User className="size-4" /> Ver Perfil Completo
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = `/clientes/${clientId}?tab=overview`)} className="w-full">
            Painel 360°
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="space-y-8 pb-10">
          <section>
            <h3 className="text-[10px] uppercase font-bold tracking-widest text-foreground/40 mb-4 flex items-center gap-2">
              <FolderKanban className="size-3.5 text-sky-500" /> Projetos e Operação
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between p-4 rounded-xl bg-background border border-border">
                <div className="flex items-center gap-3">
                  <FolderKanban className="size-4 text-foreground/30" />
                  <span className="text-sm font-medium">Projetos Ativos</span>
                </div>
                <span className="text-sm font-bold font-mono-kasa">{projects.length}</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-background border border-border">
                <div className="flex items-center gap-3">
                  <CheckSquare className="size-4 text-foreground/30" />
                  <span className="text-sm font-medium">Jobs em andamento</span>
                </div>
                <span className="text-sm font-bold font-mono-kasa">{pendingJobs}</span>
              </div>
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
