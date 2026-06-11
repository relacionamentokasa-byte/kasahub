import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Mail, Phone, Building2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { JobsBoard } from "@/components/jobs/JobsBoard";
import { ClientTimeline } from "@/components/clients/ClientTimeline";
import { ClientServicesManager } from "@/components/clients/ClientServicesManager";

export const Route = createFileRoute("/_authenticated/clientes/$clientId")({
  head: () => ({ meta: [{ title: "Cliente — KASA HUB" }] }),
  component: ClientDetail,
});

function ClientDetail() {
  const { clientId } = useParams({ from: "/_authenticated/clientes/$clientId" });
  const { data: client } = useQuery({ 
    queryKey: ["client", clientId], 
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", clientId).single();
      if (error) throw error;
      return data;
    }
  });

  if (!client) return <div className="p-10 text-foreground/40">Carregando…</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 lg:px-10 pt-6 pb-4">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight break-words">
              {client.company || client.name}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-xs text-foreground/50">
               {client.email && <span className="inline-flex items-center gap-1.5 min-h-[24px]"><Mail className="size-3" />{client.email}</span>}
               {client.phone && <span className="inline-flex items-center gap-1.5 min-h-[24px]"><Phone className="size-3" />{client.phone}</span>}
               {client.document && <span className="inline-flex items-center gap-1.5 min-h-[24px]"><Building2 className="size-3" />{client.document}</span>}
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="flex-1 flex flex-col">
        <div className="px-6 lg:px-10 border-b border-border">
          <TabsList className="bg-transparent border-0 h-auto p-0 gap-1 overflow-x-auto justify-start">
            {[
              ["overview", "Resumo"],
              ["jobs", "Jobs"],
              ["servicos", "Serviços"],
              ["timeline", "Timeline"],
            ].map(([v, label]) => (
              <TabsTrigger
                key={v}
                value={v}
                className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-3 py-2.5 text-xs capitalize whitespace-nowrap"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="flex-1 overflow-y-auto px-6 lg:px-10 py-6">
          <div className="bg-surface border border-border rounded-2xl p-5">
            <p className="text-sm text-foreground/60 italic">Resumo do cliente disponível.</p>
          </div>
        </TabsContent>

        <TabsContent value="jobs" className="flex-1 mt-0 min-h-0">
          <JobsBoard clientId={clientId} title="Jobs do Cliente" eyebrow="Cliente · Operação" />
        </TabsContent>

        <TabsContent value="servicos" className="flex-1 overflow-y-auto px-6 lg:px-10 py-6">
          <ClientServicesManager clientId={clientId} />
        </TabsContent>

        <TabsContent value="timeline" className="flex-1 overflow-y-auto px-6 lg:px-10 py-6">
          <ClientTimeline clientId={clientId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
