import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Share2,
  FileDown,
  Save,
  RotateCcw,
  Sparkles,
  ClipboardCheck,
  MessageSquareShare,
} from "lucide-react";
import { updateJob, type Job } from "@/lib/ops-api";
import {
  type CallSheetData,
  createEmptyCallSheet,
} from "@/types/call-sheet";
import { formatCallSheetForWhatsApp } from "@/lib/call-sheet-utils";
import { exportCallSheetPDF } from "@/lib/call-sheet-export";
import { CallSheetHeaderCard } from "./CallSheetHeaderCard";
import { CallSheetCrewSection } from "./CallSheetCrewSection";
import { CallSheetTimelineSection } from "./CallSheetTimelineSection";
import { CallSheetGearSection } from "./CallSheetGearSection";

interface Props {
  job: Job;
}

export function JobCallSheetTab({ job }: Props) {
  const qc = useQueryClient();

  // Inicializa com dados persistidos em custom_fields.call_sheet ou com template padrão
  const initialData: CallSheetData =
    ((job.custom_fields as any)?.call_sheet as CallSheetData) || createEmptyCallSheet();

  const [data, setData] = useState<CallSheetData>(initialData);
  const [copied, setCopied] = useState(false);

  // Sincroniza quando o job for atualizado remotamente
  useEffect(() => {
    if ((job.custom_fields as any)?.call_sheet) {
      setData((job.custom_fields as any).call_sheet);
    }
  }, [job.id, job.custom_fields]);

  const saveMutation = useMutation({
    mutationFn: async (updatedData: CallSheetData) => {
      const currentCustom = (job.custom_fields as Record<string, any>) || {};
      const newCustom = {
        ...currentCustom,
        call_sheet: updatedData,
      };

      return updateJob(job.id, {
        custom_fields: newCustom as any,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["job", job.id] });
      toast.success("Ordem do Dia / Diária salva com sucesso!");
    },
    onError: (err: Error) => {
      toast.error(`Erro ao salvar: ${err.message}`);
    },
  });

  const handleUpdate = (patch: Partial<CallSheetData>) => {
    setData((prev) => {
      const next = { ...prev, ...patch };
      return next;
    });
  };

  const handleSave = () => {
    saveMutation.mutate(data);
  };

  const handleReset = () => {
    if (confirm("Deseja restaurar a estrutura padrão da diária?")) {
      const empty = createEmptyCallSheet();
      setData(empty);
      saveMutation.mutate(empty);
    }
  };

  const handleCopyWhatsApp = () => {
    const text = formatCallSheetForWhatsApp(job.title, data);
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Resumo da diária copiado para o WhatsApp!");
    setTimeout(() => setCopied(false), 3000);
  };

  const handleExportPDF = () => {
    try {
      exportCallSheetPDF(job.title, (job as any).client?.name || "", data);
      toast.success("PDF da Ordem do Dia gerado com sucesso!");
    } catch (e) {
      toast.error(`Erro ao gerar PDF: ${(e as Error).message}`);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* Barra Superior de Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <h2 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Sparkles className="size-4 text-amber-500" /> Ordem do Dia & Cronograma da Diária
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Planejamento de set, convocação de equipe, horários e logística de gravação.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyWhatsApp}
            className="h-8 text-xs font-mono-kasa bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-800 border-emerald-500/30 gap-1.5"
          >
            {copied ? <ClipboardCheck className="size-3.5" /> : <MessageSquareShare className="size-3.5" />}
            {copied ? "Copiado!" : "Copiar WhatsApp"}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="h-8 text-xs font-mono-kasa gap-1.5"
          >
            <FileDown className="size-3.5" /> Exportar PDF
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-8 text-xs text-muted-foreground hover:text-destructive gap-1"
            title="Restaurar modelo inicial"
          >
            <RotateCcw className="size-3.5" />
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground font-medium"
          >
            <Save className="size-3.5" />
            {saveMutation.isPending ? "Salvando..." : "Salvar Diária"}
          </Button>
        </div>
      </div>

      {/* 1. Cabeçalho com Datas, Horários Principais e Locação com GPS */}
      <CallSheetHeaderCard data={data} onChange={handleUpdate} />

      {/* 2. Convocação de Equipe e Elenco com Horários Individuais */}
      <CallSheetCrewSection
        crew={data.crew || []}
        defaultCallTime={data.general_call_time || "08:00"}
        onChange={(crew) => handleUpdate({ crew })}
      />

      {/* 3. Cronograma / Linha do Tempo (com vínculo a Cenas do Roteiro) */}
      <CallSheetTimelineSection
        jobId={job.id}
        timeline={data.timeline || []}
        onChange={(timeline) => handleUpdate({ timeline })}
      />

      {/* 4. Checklist de Equipamentos & Suprimentos */}
      <CallSheetGearSection
        gear={data.gear_checklist || []}
        onChange={(gear_checklist) => handleUpdate({ gear_checklist })}
      />

      {/* 5. Orientações Gerais e Observações de Produção */}
      <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm space-y-2">
        <Label className="text-xs font-semibold text-foreground">
          Orientações Gerais, Clima & Restrições do Set
        </Label>
        <Textarea
          rows={3}
          value={data.general_notes || ""}
          onChange={(e) => handleUpdate({ general_notes: e.target.value })}
          placeholder="Ex: Levar protetor solar, alimentação será fornecida no local, proibido fumar no estúdio..."
          className="text-xs font-normal leading-relaxed bg-muted/20 border-border/60 resize-y rounded-md"
        />
      </div>
    </div>
  );
}
