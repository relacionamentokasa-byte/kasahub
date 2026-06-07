import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ApprovalsGrid } from "@/components/approvals/ApprovalsGrid";
import { ApprovalSheet } from "@/components/approvals/ApprovalSheet";
import { NewApprovalDialog } from "@/components/approvals/NewApprovalDialog";
import { fetchClients } from "@/lib/ops-api";
import { type Approval, type ApprovalStatus } from "@/lib/approvals-api";

export const Route = createFileRoute("/_authenticated/aprovacoes")({
  head: () => ({ meta: [{ title: "Aprovações — KASA HUB" }] }),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const [status, setStatus] = useState<ApprovalStatus | "all">("all");
  const [clientId, setClientId] = useState<string>("all");
  const [selected, setSelected] = useState<Approval | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });

  return (
    <div className="p-4 lg:p-8 space-y-6 pb-20 md:pb-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-mono-kasa capitalize text-primary/70">
            Experiência · Aprovações
          </p>
          <h1 className="font-display text-2xl lg:text-4xl mt-1">Feed de aprovações</h1>
          <p className="text-sm text-foreground/60 mt-2">
            Pré-visualize, comente e aprove cada peça antes da publicação — no estilo Instagram.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)} className="gap-2">
          <Plus className="size-4" /> Nova peça
        </Button>
      </header>

      <div className="flex flex-wrap gap-3 sticky top-0 z-10 bg-background/95 backdrop-blur py-2">
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger className="w-56 bg-surface border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={status} onValueChange={(v) => setStatus(v as ApprovalStatus | "all")}>
        <TabsList className="bg-surface">
          <TabsTrigger value="all"><Sparkles className="size-3 mr-1.5" />Tudo</TabsTrigger>
          <TabsTrigger value="pending">Aguardando</TabsTrigger>
          <TabsTrigger value="changes_requested">Ajustes</TabsTrigger>
          <TabsTrigger value="approved">Aprovados</TabsTrigger>
          <TabsTrigger value="published">Publicados</TabsTrigger>
        </TabsList>
        <div className="mt-6">
          <ApprovalsGrid
            clientId={clientId === "all" ? undefined : clientId}
            status={status === "all" ? undefined : status}
            onSelect={setSelected}
            showClient
          />
        </div>
      </Tabs>

      <ApprovalSheet
        approvalId={selected?.id ?? null}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
      <NewApprovalDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}
