import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Globe, ExternalLink, Sparkles, ImageIcon, Calendar as CalendarIcon, FolderKanban, FileSignature, DollarSign } from "lucide-react";
import { fetchMyPortalClient, type Approval } from "@/lib/approvals-api";
import { fetchProjects } from "@/lib/ops-api";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApprovalsGrid } from "@/components/approvals/ApprovalsGrid";
import { ApprovalSheet } from "@/components/approvals/ApprovalSheet";
import { CalendarMonth } from "@/components/calendar/CalendarMonth";

export const Route = createFileRoute("/_authenticated/portal")({
  head: () => ({ meta: [{ title: "Portal do Cliente — KASA HUB" }] }),
  component: PortalPage,
});

function PortalPage() {
  const [selected, setSelected] = useState<Approval | null>(null);

  const { data: portalClient, isLoading } = useQuery({
    queryKey: ["my-portal-client"],
    queryFn: fetchMyPortalClient,
  });

  if (isLoading) {
    return <div className="p-8 text-foreground/50">Carregando portal…</div>;
  }

  // If no portal client → team view (preview / manage)
  if (!portalClient) {
    return <TeamPortalOverview />;
  }

  return <ClientPortalView clientId={portalClient.id} client={portalClient} onSelect={setSelected} selected={selected} />;
}

function ClientPortalView({
  clientId,
  client,
  selected,
  onSelect,
}: {
  clientId: string;
  client: { name: string; logo_url: string | null; banner_url: string | null; brand_primary: string | null };
  selected: Approval | null;
  onSelect: (a: Approval | null) => void;
}) {
  const brandColor = client.brand_primary || "#FFBC45";
  const { data: projects = [] } = useQuery({
    queryKey: ["client-projects", clientId],
    queryFn: () => fetchProjects({ clientId }),
  });
  const { data: contracts = [] } = useQuery({
    queryKey: ["client-contracts", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("contracts").select("*").eq("client_id", clientId).eq("status", "active");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: transactions = [] } = useQuery({
    queryKey: ["client-transactions", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions")
        .select("*")
        .eq("client_id", clientId)
        .order("due_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-full">
      {/* Hero with branding */}
      <div
        className="relative h-48 lg:h-64 border-b border-border overflow-hidden"
        style={{
          background: client.banner_url
            ? `url(${client.banner_url}) center/cover`
            : `linear-gradient(135deg, ${brandColor}30, transparent)`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8 flex items-end gap-4">
          {client.logo_url ? (
            <img
              src={client.logo_url}
              alt={client.name}
              className="size-20 rounded-xl object-cover border-2 ring-2"
              style={{ borderColor: brandColor, boxShadow: `0 0 40px ${brandColor}40` }}
            />
          ) : (
            <div
              className="size-20 rounded-xl flex items-center justify-center text-2xl font-display font-bold"
              style={{ backgroundColor: `${brandColor}25`, color: brandColor }}
            >
              {client.name[0]}
            </div>
          )}
          <div>
            <p className="text-[10px] font-mono-kasa capitalize" style={{ color: brandColor }}>
              Portal Kasa × Cliente
            </p>
            <h1 className="font-display text-3xl lg:text-4xl mt-1">{client.name}</h1>
          </div>
        </div>
      </div>

      <div className="p-6 lg:p-8 space-y-6">
        <Tabs defaultValue="feed">
          <TabsList className="bg-surface">
            <TabsTrigger value="feed"><ImageIcon className="size-3 mr-1.5" />Feed</TabsTrigger>
            <TabsTrigger value="calendar"><CalendarIcon className="size-3 mr-1.5" />Calendário</TabsTrigger>
            <TabsTrigger value="projects"><FolderKanban className="size-3 mr-1.5" />Projetos</TabsTrigger>
            <TabsTrigger value="contracts"><FileSignature className="size-3 mr-1.5" />Contratos</TabsTrigger>
            <TabsTrigger value="finance"><DollarSign className="size-3 mr-1.5" />Financeiro</TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="mt-6 space-y-4">
            <p className="text-sm text-foreground/60">
              Toque em uma peça para visualizar, aprovar ou pedir ajustes.
            </p>
            <ApprovalsGrid clientId={clientId} onSelect={(a) => onSelect(a)} />
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <CalendarMonth clientId={clientId} />
          </TabsContent>

          <TabsContent value="projects" className="mt-6 space-y-3">
            {projects.length === 0 ? (
              <p className="text-sm text-foreground/50 text-center py-8">Nenhum projeto ativo</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {projects.map((p) => (
                  <Card key={p.id} className="bg-surface border-border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{p.name}</p>
                          <p className="text-xs text-foreground/50 mt-1 capitalize">{p.status}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono-kasa">
                          {p.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="contracts" className="mt-6 space-y-3">
            {contracts.length === 0 ? (
              <p className="text-sm text-foreground/50 text-center py-8">Nenhum contrato ativo</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {contracts.map((c) => (
                  <Card key={c.id} className="bg-surface border-border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{c.title}</p>
                          <p className="text-[10px] text-primary mt-1 uppercase font-bold tracking-wider">
                            {c.type === "recurring" ? "Mensal" : "Projeto"}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 uppercase">
                          Ativo
                        </Badge>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-[11px] text-foreground/50 border-t border-border/50 pt-3">
                        <span>Vigência: {c.start_date ? new Date(c.start_date).toLocaleDateString("pt-BR") : "—"}</span>
                        <span className="font-bold text-foreground">
                          {c.monthly_value > 0 ? (
                            `${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c.monthly_value)}/mês`
                          ) : (
                            new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c.total_value || 0)
                          )}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="finance" className="mt-6">
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-border bg-background/20">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <DollarSign className="size-4 text-primary" /> Histórico Financeiro
                </h3>
              </div>
              {transactions.length === 0 ? (
                <p className="text-sm text-foreground/50 text-center py-10">Nenhum lançamento financeiro disponível</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-left text-[10px] uppercase text-foreground/40 border-b border-border bg-background/10">
                      <tr>
                        <th className="py-3 px-4">Descrição</th>
                        <th className="py-3 px-4">Vencimento</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.filter(t => t.kind === "income").map((t) => (
                        <tr key={t.id} className="border-b border-border/40 hover:bg-background/5 transition-colors">
                          <td className="py-3 px-4 font-medium">{t.description}</td>
                          <td className="py-3 px-4 text-foreground/60">
                            {t.due_date ? new Date(t.due_date).toLocaleDateString("pt-BR") : "—"}
                          </td>
                          <td className="py-3 px-4">
                            <Badge 
                              variant="outline" 
                              className={`text-[9px] uppercase ${t.status === "paid" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : "bg-amber-500/15 text-amber-400 border-amber-500/20"}`}
                            >
                              {t.status === "paid" ? "Pago" : "Pendente"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-400">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(t.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ApprovalSheet
        approvalId={selected?.id ?? null}
        open={!!selected}
        onOpenChange={(o) => !o && onSelect(null)}
        asClient
      />
    </div>
  );
}

function TeamPortalOverview() {
  const { data: clients = [] } = useQuery({
    queryKey: ["all-clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <header>
        <p className="text-[10px] font-mono-kasa capitalize text-primary/70">
          Experiência · Portal do Cliente
        </p>
        <h1 className="font-display text-3xl lg:text-4xl mt-1">Portais ativos</h1>
        <p className="text-sm text-foreground/60 mt-2">
          Cada cliente com acesso ao portal recebe um espaço personalizado com seu branding,
          feed de aprovações e calendário. Conecte o usuário em <strong>Clientes → portal_user_id</strong>.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((c) => {
          const brand = c.brand_primary || "#FFBC45";
          const hasPortal = !!c.portal_user_id;
          return (
            <Card key={c.id} className="bg-surface border-border overflow-hidden">
              <div
                className="h-20 relative"
                style={{
                  background: c.banner_url
                    ? `url(${c.banner_url}) center/cover`
                    : `linear-gradient(135deg, ${brand}40, ${brand}10)`,
                }}
              />
              <CardContent className="p-4 -mt-8 relative">
                <div className="flex items-end gap-3">
                  {c.logo_url ? (
                    <img src={c.logo_url} alt={c.name} className="size-12 rounded-lg object-cover border-2 border-surface" />
                  ) : (
                    <div
                      className="size-12 rounded-lg flex items-center justify-center font-display font-bold border-2 border-surface"
                      style={{ backgroundColor: `${brand}30`, color: brand }}
                    >
                      {c.name[0]}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{c.name}</p>
                    <Badge
                      variant="outline"
                      className={`text-[10px] mt-1 ${hasPortal ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-muted text-muted-foreground"}`}
                    >
                      {hasPortal ? "Portal ativo" : "Sem acesso"}
                    </Badge>
                  </div>
                </div>
                <Link
                  to="/clientes/$clientId"
                  params={{ clientId: c.id }}
                  className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Gerenciar <ExternalLink className="size-3" />
                </Link>
              </CardContent>
            </Card>
          );
        })}
        {!clients.length && (
          <Card className="bg-surface border-border border-dashed col-span-full">
            <CardContent className="p-8 text-center text-foreground/50">
              <Globe className="size-8 mx-auto mb-2 opacity-40" />
              Nenhum cliente cadastrado ainda.
              <div className="mt-2 inline-flex items-center gap-1 text-xs text-primary">
                <Sparkles className="size-3" /> Adicione clientes para abrir portais
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
