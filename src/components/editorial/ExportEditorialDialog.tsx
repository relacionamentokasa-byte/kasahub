import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { FileText, Download, CalendarDays } from "lucide-react";
import { listEditorialPosts, type EditorialPost } from "@/lib/editorial-api";
import { getMonthStrategy } from "@/lib/editorial-strategy-api";
import { exportEditorialPostsPDF, exportEditorialPostsCSV } from "@/lib/editorial-export";
import { toast } from "sonner";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function generateYears() {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current - 2; y <= current + 5; y++) years.push(y);
  return years;
}

const YEARS = generateYears();

interface ExportEditorialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  clientLogoUrl?: string | null;
  defaultDate?: Date;
}

export function ExportEditorialDialog({
  open, onOpenChange, clientId, clientName, clientLogoUrl, defaultDate,
}: ExportEditorialDialogProps) {
  const base = defaultDate ?? new Date();
  const [year, setYear] = useState(base.getFullYear());
  const [month, setMonth] = useState(base.getMonth() + 1);
  const [loading, setLoading] = useState<{ pdf: boolean; csv: boolean }>({ pdf: false, csv: false });

  const handleExport = async (format: "pdf" | "csv") => {
    if (!clientId) return;
    setLoading(prev => ({ ...prev, [format]: true }));
    try {
      const from = new Date(year, month - 1, 1).toISOString();
      const to = new Date(year, month, 0, 23, 59, 59).toISOString();

      const posts = await listEditorialPosts({ clientId, from, to });

      if (format === "pdf") {
        const strategy = await getMonthStrategy(clientId, year, month);
        await exportEditorialPostsPDF({
          clientName,
          clientLogoUrl: clientLogoUrl ?? null,
          strategy,
          cursor: new Date(year, month - 1, 1),
          posts,
        });
      } else {
        exportEditorialPostsCSV({
          clientName,
          cursor: new Date(year, month - 1, 1),
          posts,
        });
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao exportar calendário");
    } finally {
      setLoading(prev => ({ ...prev, [format]: false }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <CalendarDays className="size-5 text-primary" />
            Exportar calendário
          </DialogTitle>
          <DialogDescription>
            Selecione o mês que deseja exportar para {clientName || "o cliente"}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/60">Mês</label>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="h-10 rounded-xl border-foreground/10 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((name, idx) => (
                  <SelectItem key={idx + 1} value={String(idx + 1)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/60">Ano</label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="h-10 rounded-xl border-foreground/10 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => onOpenChange(false)}
            disabled={loading.pdf || loading.csv}
          >
            Cancelar
          </Button>
          <Button
            variant="secondary"
            className="rounded-full"
            onClick={() => handleExport("csv")}
            disabled={loading.pdf || loading.csv}
          >
            <Download className="size-4 mr-1.5" />
            {loading.csv ? "Exportando..." : "CSV"}
          </Button>
          <Button
            className="rounded-full"
            onClick={() => handleExport("pdf")}
            disabled={loading.pdf || loading.csv}
          >
            <FileText className="size-4 mr-1.5" />
            {loading.pdf ? "Exportando..." : "PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
