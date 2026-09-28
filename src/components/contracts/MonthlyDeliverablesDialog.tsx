import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  FileDown,
  Sparkles,
  Calendar,
  CheckSquare,
  Clapperboard,
  Loader2,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  exportMonthlyDeliverablesPDF,
  type MonthlyJobItem,
  type MonthlyEditorialItem,
  type MonthlyDmeItem,
} from "@/lib/monthly-deliverables-pdf";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  clientCompany?: string | null;
  clientLogoUrl?: string | null;
  contract?: {
    id: string;
    title: string;
    monthly_value: number | null;
  };
}

export function MonthlyDeliverablesDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  clientCompany,
  clientLogoUrl,
  contract,
}: Props) {
  // Gerar opções dos últimos 6 meses para seleção
  const monthOptions = useMemo(() => {
    const opts = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth(); // 0 a 11
      const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
      opts.push({
        key: `${year}-${String(month + 1).padStart(2, "0")}`,
        label: capitalizedLabel,
        startDate: new Date(year, month, 1).toISOString().split("T")[0],
        endDate: new Date(year, month + 1, 0).toISOString().split("T")[0],
      });
    }
    return opts;
  }, []);

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(monthOptions[0]?.key || "");
  const [executiveNotes, setExecutiveNotes] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const currentMonthConfig = monthOptions.find((m) => m.key === selectedMonthKey) || monthOptions[0];

  // 1. Buscar Jobs concluídos no mês
  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ["monthly-deliverables-jobs", clientId, currentMonthConfig?.key],
    enabled: open && !!clientId && !!currentMonthConfig,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, status, done_at, created_at, services(name), projects(name)")
        .eq("client_id", clientId)
        .eq("status", "done")
        .gte("done_at", `${currentMonthConfig.startDate}T00:00:00`)
        .lte("done_at", `${currentMonthConfig.endDate}T23:59:59`)
        .order("done_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // 2. Buscar Posts Editoriais do mês
  const { data: posts = [], isLoading: loadingPosts } = useQuery({
    queryKey: ["monthly-deliverables-posts", clientId, currentMonthConfig?.key],
    enabled: open && !!clientId && !!currentMonthConfig,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("editorial_posts")
        .select("id, title, social_network, content_type, scheduled_at, status")
        .eq("client_id", clientId)
        .gte("scheduled_at", `${currentMonthConfig.startDate}T00:00:00`)
        .lte("scheduled_at", `${currentMonthConfig.endDate}T23:59:59`)
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // 3. Buscar Demandas Extras (DMEs) do mês
  const { data: dmes = [], isLoading: loadingDmes } = useQuery({
    queryKey: ["monthly-deliverables-dmes", clientId, currentMonthConfig?.key],
    enabled: open && !!clientId && !!currentMonthConfig,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("extra_demands")
        .select("id, number_display, title, price, approved_at, status")
        .eq("client_id", clientId)
        .gte("approved_at", `${currentMonthConfig.startDate}T00:00:00`)
        .lte("approved_at", `${currentMonthConfig.endDate}T23:59:59`);

      if (error) throw error;
      return data || [];
    },
  });

  // Seleção de itens ativos para o relatório
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  const [selectedDmeIds, setSelectedDmeIds] = useState<string[]>([]);

  // Inicializa a seleção quando os dados chegam
  useMemo(() => {
    if (jobs.length > 0) setSelectedJobIds(jobs.map((j) => j.id));
    if (posts.length > 0) setSelectedPostIds(posts.map((p) => p.id));
    if (dmes.length > 0) setSelectedDmeIds(dmes.map((d) => d.id));
  }, [jobs, posts, dmes]);

  const toggleJob = (id: string) => {
    setSelectedJobIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const togglePost = (id: string) => {
    setSelectedPostIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleDme = (id: string) => {
    setSelectedDmeIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleGeneratePDF = async () => {
    try {
      setIsExporting(true);

      const filteredJobs: MonthlyJobItem[] = jobs
        .filter((j) => selectedJobIds.includes(j.id))
        .map((j) => ({
          id: j.id,
          title: j.title,
          service_name: (j as any).services?.name,
          project_name: (j as any).projects?.name,
          done_at: j.done_at,
        }));

      const filteredPosts: MonthlyEditorialItem[] = posts
        .filter((p) => selectedPostIds.includes(p.id))
        .map((p) => ({
          id: p.id,
          title: p.title,
          social_network: p.social_network,
          content_type: p.content_type,
          scheduled_at: p.scheduled_at,
        }));

      const filteredDmes: MonthlyDmeItem[] = dmes
        .filter((d) => selectedDmeIds.includes(d.id))
        .map((d) => ({
          id: d.id,
          number_display: d.number_display || undefined,
          title: d.title,
          value: Number(d.price || 0),
          approved_at: d.approved_at,
        }));

      await exportMonthlyDeliverablesPDF({
        clientName,
        clientCompany,
        clientLogoUrl,
        periodLabel: currentMonthConfig.label,
        contractTitle: contract?.title,
        monthlyValue: contract?.monthly_value || undefined,
        jobs: filteredJobs,
        posts: filteredPosts,
        dmes: filteredDmes,
        executiveNotes,
      });

      toast.success("PDF do Relatório Mensal gerado com sucesso!");
      onOpenChange(false);
    } catch (err) {
      toast.error(`Erro ao gerar PDF: ${(err as Error).message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading = loadingJobs || loadingPosts || loadingDmes;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="size-5 text-amber-500" />
            Relatório Mensal de Entregas & Fechamento
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Exporte um PDF profissional consolidando todos os Jobs, postagens e demandas entregues no mês de competência do contrato.
          </p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Seletor do Mês de Competência */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Mês de Competência</Label>
            <Select value={selectedMonthKey} onValueChange={setSelectedMonthKey}>
              <SelectTrigger className="text-xs h-9 bg-background font-mono-kasa">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.key} value={opt.key} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lista de Jobs Concluídos no Período */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <CheckSquare className="size-4 text-emerald-500" />
                Jobs Concluídos no Mês ({jobs.length})
              </Label>
              <span className="text-[11px] text-muted-foreground font-mono-kasa">
                {selectedJobIds.length} selecionados
              </span>
            </div>

            {loadingJobs ? (
              <div className="py-6 flex items-center justify-center text-xs text-muted-foreground gap-2">
                <Loader2 className="size-4 animate-spin" /> Carregando jobs do mês...
              </div>
            ) : jobs.length === 0 ? (
              <div className="p-4 border border-dashed border-border/60 rounded-lg text-center text-xs text-muted-foreground">
                Nenhum job com status 'Concluído' finalizado neste mês.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto border border-border/60 rounded-lg divide-y divide-border/40 bg-card">
                {jobs.map((job) => {
                  const isChecked = selectedJobIds.includes(job.id);
                  return (
                    <div
                      key={job.id}
                      onClick={() => toggleJob(job.id)}
                      className="p-2.5 flex items-center justify-between gap-2 hover:bg-muted/10 cursor-pointer transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Checkbox checked={isChecked} className="size-3.5" />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{job.title}</p>
                          <p className="text-[10px] text-muted-foreground font-mono-kasa">
                            {(job as any).services?.name || (job as any).projects?.name || "Serviço"} • Entregue em {job.done_at ? new Date(job.done_at).toLocaleDateString("pt-BR") : "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Posts Editoriais (se houver) */}
          {posts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Clapperboard className="size-4 text-primary" />
                  Calendário Editorial & Conteúdos ({posts.length})
                </Label>
                <span className="text-[11px] text-muted-foreground font-mono-kasa">
                  {selectedPostIds.length} selecionados
                </span>
              </div>

              <div className="max-h-36 overflow-y-auto border border-border/60 rounded-lg divide-y divide-border/40 bg-card">
                {posts.map((post) => {
                  const isChecked = selectedPostIds.includes(post.id);
                  return (
                    <div
                      key={post.id}
                      onClick={() => togglePost(post.id)}
                      className="p-2 flex items-center justify-between gap-2 hover:bg-muted/10 cursor-pointer transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Checkbox checked={isChecked} className="size-3.5" />
                        <span className="font-medium text-foreground truncate">{post.title}</span>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-mono-kasa uppercase">
                        {post.social_network}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Resumo Executivo / Mensagem Personalizada */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Resumo Executivo / Destaques do Mês (Opcional)</Label>
            <Textarea
              rows={3}
              value={executiveNotes}
              onChange={(e) => setExecutiveNotes(e.target.value)}
              placeholder="Ex: Neste mês atingimos 100% do cronograma de gravações, finalizamos o novo institucional e iniciamos os testes de público..."
              className="text-xs bg-muted/10 leading-relaxed"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleGeneratePDF}
            disabled={isExporting || isLoading}
            className="text-xs gap-1.5 bg-primary text-primary-foreground font-semibold"
          >
            {isExporting ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5" />}
            {isExporting ? "Gerando PDF..." : "Exportar PDF de Fechamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
