import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ClientDetailContent } from "@/routes/_authenticated/clientes.$clientId";
import { useQuery } from "@tanstack/react-query";
import { fetchClient, fetchJobs, fetchExtraDemands, fetchProjects } from "@/lib/ops-api";
import { fetchContracts, brl } from "@/lib/finance-api";
import { FileSignature, FolderKanban, CheckSquare, Activity, DollarSign, Clock, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { fetchProfiles } from "@/lib/profile-api";

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
  const { data: contracts = [] } = useQuery({ queryKey: ["contracts", clientId], queryFn: async () => {
    const { data } = await (supabase as any).from("contracts").select("*").eq("client_id", clientId);
    return data || [];
  }});
  const { data: projects = [] } = useQuery({ queryKey: ["projects", { clientId }], queryFn: () => fetchProjects({ clientId }) });
  const { data: jobs = [] } = useQuery({ queryKey: ["jobs", { clientId }], queryFn: () => fetchJobs({ clientId }) });
  const { data: dmes = [] } = useQuery({ queryKey: ["extra-demands", { clientId }], queryFn: () => fetchExtraDemands({ clientId }) });
  const { data: profiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });

  if (!client) return null;

  const activeContracts = contracts.filter((c: any) => c.status === "active");
  const monthlyRevenue = activeContracts.reduce((acc: number, c: any) => acc + Number(c.monthly_value || 0), 0);
  const pendingJobs = jobs.filter((j: any) => !j.done_at).length;
  const activeDmes = dmes.filter((d: any) => d.status !== 'completed' && d.status !== 'cancelled').length;
  
  const mainContract = activeContracts[0];
  const responsibleId = client.responsible_id || mainContract?.owner_id;
  const responsible = profiles.find(p => p.id === responsibleId);

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="p-6 border-b border-border bg-background/50">
        <div className="flex items-center gap-4 mb-4">
          <div
            className="size-16 rounded-2xl grid place-items-center font-display font-bold text-2xl overflow-hidden shrink-0 border border-border"
            style={{ background: `${client.brand_primary}22`, color: client.brand_primary ?? "#FFBC45" }}
          >
            {client.logo_url ? (
              <img src={client.logo_url} alt="" className="size-full object-cover" />
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
              <FileSignature className="size-3.5 text-primary" /> Contratos Ativos ({activeContracts.length})
            </h3>
            <div className="space-y-3">
              {activeContracts.length > 0 ? activeContracts.map((c: any) => (
                <div key={c.id} className="p-4 rounded-xl bg-background border border-border flex justify-between items-center">
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{c.title}</p>
                    <p className="text-[10px] text-foreground/40 font-mono-kasa">Vence dia {c.billing_day}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-mono-kasa font-bold text-primary">{brl(c.monthly_value)}</p>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-foreground/30 italic">Nenhum contrato ativo.</p>
              )}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-background border border-border">
              <div className="flex items-center gap-2 text-foreground/40 mb-1">
                <DollarSign className="size-3.5 text-emerald-500" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Receita Mensal</span>
              </div>
              <p className="text-lg font-mono-kasa font-bold">{brl(monthlyRevenue)}</p>
            </div>
            <div className="p-4 rounded-xl bg-background border border-border">
              <div className="flex items-center gap-2 text-foreground/40 mb-1">
                <Clock className="size-3.5 text-primary" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Próx. Venc.</span>
              </div>
              <p className="text-sm font-bold">Consulte Financeiro</p>
            </div>
          </div>

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
              <div className="flex items-center justify-between p-4 rounded-xl bg-background border border-border">
                <div className="flex items-center gap-3">
                  <Activity className="size-4 text-foreground/30" />
                  <span className="text-sm font-medium">DMEs abertas</span>
                </div>
                <span className="text-sm font-bold font-mono-kasa">{activeDmes}</span>
              </div>
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}

// Need to import supabase for local queries
import { supabase } from "@/integrations/supabase/client";
