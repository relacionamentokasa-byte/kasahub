import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, FileText, Presentation, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { fetchReports, fetchReportTemplates, createReport, deleteReport } from "@/lib/reports-api";
import { fetchClients } from "@/lib/ops-api";
import type { Slide } from "@/components/reports/types";
import { newSlide } from "@/components/reports/types";

export const Route = createFileRoute("/_authenticated/construtor-relatorios/")({
  head: () => ({ meta: [{ title: "Construtor de Relatórios — KASA HUB" }] }),
  component: ReportBuilderListPage,
});

function ReportBuilderListPage() {
  const [open, setOpen] = useState(false);
  const reportsQ = useQuery({ queryKey: ["reports"], queryFn: fetchReports });
  const clientsQ = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const qc = useQueryClient();

  const del = useMutation({
    mutationFn: deleteReport,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      toast.success("Relatório removido");
    },
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto animate-reveal">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-foreground/50 hover:text-foreground mb-2">
            <ArrowLeft className="size-3" /> Dashboard
          </Link>
          <span className="text-primary text-[10px] font-mono-kasa uppercase font-medium">Gestão · Apresentações</span>
          <h1 className="font-display text-2xl lg:text-4xl font-bold tracking-tight mt-1">Construtor de Relatórios</h1>
          <p className="text-foreground/50 text-xs lg:text-sm mt-1">
            Monte relatórios de cliente a partir de templates. Apresente em tela cheia ou exporte em PDF.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4 mr-2" /> Novo relatório
        </Button>
      </header>

      {reportsQ.isLoading ? (
        <div className="text-foreground/50">Carregando…</div>
      ) : reportsQ.data && reportsQ.data.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {reportsQ.data.map((r) => {
            const client = clientsQ.data?.find((c) => c.id === r.client_id);
            return (
              <Card key={r.id} className="p-5 rounded-2xl flex flex-col gap-3 hover:shadow-md transition-all group">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    to="/relatorios/construtor/$reportId"
                    params={{ reportId: r.id }}
                    className="flex-1 min-w-0"
                  >
                    <p className="text-[10px] font-mono uppercase tracking-wider text-foreground/40">
                      {client?.company || client?.name || "Sem cliente"}
                    </p>
                    <h3 className="font-display text-lg font-semibold truncate">{r.title}</h3>
                  </Link>
                  <Badge variant={r.status === "finalizado" ? "default" : "secondary"} className="shrink-0">
                    {r.status}
                  </Badge>
                </div>
                <p className="text-xs text-foreground/50">
                  Atualizado {format(new Date(r.updated_at), "dd MMM yyyy", { locale: ptBR })} ·{" "}
                  {(r.slides as unknown as Slide[])?.length ?? 0} slides
                </p>
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <Link to="/relatorios/construtor/$reportId" params={{ reportId: r.id }} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <FileText className="size-3.5 mr-1.5" /> Editar
                    </Button>
                  </Link>
                  <Link to="/relatorios/construtor/$reportId/apresentar" params={{ reportId: r.id }}>
                    <Button variant="outline" size="sm">
                      <Presentation className="size-3.5" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-foreground/50 hover:text-rose-600"
                    onClick={() => {
                      if (confirm("Remover este relatório?")) del.mutate(r.id);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="border border-dashed border-border rounded-2xl p-12 text-center text-foreground/50">
          <FileText className="size-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhum relatório ainda. Crie o primeiro a partir de um template.</p>
        </div>
      )}

      <NewReportDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function NewReportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const clientsQ = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const templatesQ = useQuery({ queryKey: ["report-templates"], queryFn: fetchReportTemplates });
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [templateId, setTemplateId] = useState<string>("");

  const submit = useMutation({
    mutationFn: async () => {
      const tpl = templatesQ.data?.find((t) => t.id === templateId);
      const slides: Slide[] = templateId === "blank"
        ? [newSlide("cover")]
        : ((tpl?.slides as unknown as Slide[]) ?? [newSlide("cover")]);
      return createReport({
        client_id: clientId || null,
        template_id: templateId === "blank" ? null : (templateId || null),
        title: title.trim() || "Novo relatório",
        slides,
      });
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      onOpenChange(false);
      setTitle(""); setClientId(""); setTemplateId("");
      navigate({ to: "/relatorios/construtor/$reportId", params: { reportId: r.id } });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao criar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo relatório</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Relatório de junho — Cliente X" />
          </div>
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>
                {clientsQ.data?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue placeholder="Escolha um template" /></SelectTrigger>
              <SelectContent>
                {templatesQ.data?.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
                <SelectItem value="blank">Em branco</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => submit.mutate()} disabled={!templateId || submit.isPending}>
            {submit.isPending ? "Criando…" : "Criar e abrir editor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
