import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  bulkInsertTransactions,
  fetchBankAccounts,
  fetchCategories,
} from "@/lib/finance-api";
import { fetchClients } from "@/lib/ops-api";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X, ChevronRight, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

type Row = Record<string, any>;

interface ImportResult {
  success: number;
  errors: { row: number; description: string; error: string }[];
}

function parseDate(v: any, XLSX: any): string | null {
  if (!v) return null;
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) {
      const dt = new Date(Date.UTC(d.y, d.m - 1, d.d));
      return dt.toISOString().slice(0, 10);
    }
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function parseAmount(v: any): number {
  if (typeof v === "number") return v;
  if (!v) return 0;
  const s = String(v).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

export function ImportTransactionsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const { data: accounts = [] } = useQuery({ queryKey: ["bank_accounts"], queryFn: fetchBankAccounts });
  const { data: categories = [] } = useQuery({ queryKey: ["financial_categories"], queryFn: fetchCategories });

  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const onFile = async (file: File) => {
    try {
      setIsProcessing(true);
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Row>(sheet, { defval: "" });
      
      if (json.length === 0) {
        toast.error("Arquivo vazio ou sem dados válidos");
        return;
      }

      setHeaders(Object.keys(json[0]));
      setRows(json);
      setResult(null);
    } catch (error) {
      console.error("Erro ao ler arquivo:", error);
      toast.error("Erro ao ler o arquivo. Verifique se é um .xlsx válido.");
    } finally {
      setIsProcessing(false);
    }
  };

  const guessMapping = (hdrs: string[]) => {
    const lowerHdrs = hdrs.map(h => h.toLowerCase());
    const find = (keywords: string[]) => {
      const idx = lowerHdrs.findIndex(h => keywords.some(k => h.includes(k)));
      return idx >= 0 ? hdrs[idx] : null;
    };

    return {
      kind: find(["tipo", "kind"]),
      description: find(["descri", "histor", "lanc"]),
      category: find(["categ"]),
      client: find(["cliente", "client", "empresa"]),
      amount: find(["valor", "amount", "total", "preço"]),
      due_date: find(["venc", "data", "date"]),
      status: find(["status", "situa"]),
      installment: find(["parce", "installa"]),
      competence: find(["compet", "mês", "mes"]),
      notes: find(["obser", "nota", "note"])
    };
  };

  const mapping = useMemo(() => guessMapping(headers), [headers]);

  const mut = useMutation({
    mutationFn: async () => {
      const XLSX = await import("xlsx");
      const clientByName = new Map(clients.map((c) => [(c.company || c.name).toLowerCase().trim(), c.id]));
      const catByName = new Map(categories.map((c) => [c.name.toLowerCase().trim(), c.id]));
      
      const batchId = crypto.randomUUID();
      const inserts: any[] = [];
      const errors: ImportResult["errors"] = [];

      rows.forEach((r, index) => {
        try {
          const description = mapping.description ? String(r[mapping.description] || "").trim() : "";
          const amount = mapping.amount ? parseAmount(r[mapping.amount]) : 0;
          const dueDate = mapping.due_date ? parseDate(r[mapping.due_date], XLSX) : null;
          
          // Validação básica
          if (!description) throw new Error("Descrição obrigatória ausente");
          if (!amount && amount !== 0) throw new Error("Valor inválido");
          if (!dueDate) throw new Error("Vencimento inválido ou ausente");

          const kindRaw = mapping.kind ? String(r[mapping.kind] || "").toLowerCase().trim() : "";
          let kind = "expense";
          if (kindRaw.includes("receita") || kindRaw === "income" || kindRaw === "entrada") kind = "income";
          else if (kindRaw.includes("transfer") || kindRaw === "transferência") kind = "transfer";
          else if (kindRaw.includes("ajuste") || kindRaw === "adjustment") kind = "adjustment";

          const statusRaw = mapping.status ? String(r[mapping.status] || "").toLowerCase().trim() : "";
          let status = "pending";
          if (statusRaw.startsWith("pag") || statusRaw === "paid" || statusRaw === "recebido") status = "paid";
          else if (statusRaw.startsWith("can")) status = "cancelled";

          const cName = mapping.client ? String(r[mapping.client] || "").toLowerCase().trim() : "";
          const catName = mapping.category ? String(r[mapping.category] || "").toLowerCase().trim() : "";

          inserts.push({
            description,
            amount,
            due_date: dueDate,
            kind,
            status,
            import_batch_id: batchId,
            paid_at: status === "paid" ? dueDate : null,
            client_id: clientByName.get(cName) || null,
            category_id: catByName.get(catName) || null,
            installment_number: mapping.installment ? (parseInt(String(r[mapping.installment])) || null) : null,
            notes: [
              mapping.notes ? String(r[mapping.notes] || "") : "",
              mapping.competence ? `Competência: ${r[mapping.competence]}` : ""
            ].filter(Boolean).join(" | ")
          });
        } catch (e: any) {
          errors.push({
            row: index + 2,
            description: String(r[mapping.description || ""] || "Sem descrição"),
            error: e.message
          });
        }
      });

      if (inserts.length > 0) {
        await bulkInsertTransactions(inserts);
      }

      return { success: inserts.length, errors };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      setResult(res);
      if (res.errors.length === 0) {
        toast.success(`${res.success} lançamentos importados com sucesso!`);
      } else {
        toast.warning(`Importação concluída com ${res.errors.length} erro(s).`);
      }
    },
    onError: (e: Error) => toast.error(`Erro crítico na importação: ${e.message}`),
  });

  const reset = () => {
    setRows([]);
    setHeaders([]);
    setResult(null);
    setIsProcessing(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="bg-surface border-border max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-primary" /> Importar Planilha Financeira
          </DialogTitle>
          <DialogDescription>
            Envie um arquivo .xlsx com as colunas: TIPO, DESCRIÇÃO, CATEGORIA, CLIENTE, VALOR, VENCIMENTO, STATUS, etc.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-6 pb-6">
          {isProcessing ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4">
              <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-foreground/60">Processando arquivo...</p>
            </div>
          ) : result ? (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center">
                  <div className="text-3xl font-bold text-emerald-500">{result.success}</div>
                  <div className="text-xs font-medium text-emerald-500/80 uppercase tracking-wider mt-1">Importados com sucesso</div>
                </div>
                <div className={`${result.errors.length > 0 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-foreground/5 border-border'} border rounded-2xl p-6 text-center`}>
                  <div className={`text-3xl font-bold ${result.errors.length > 0 ? 'text-rose-500' : 'text-foreground/40'}`}>{result.errors.length}</div>
                  <div className={`text-xs font-medium uppercase tracking-wider mt-1 ${result.errors.length > 0 ? 'text-rose-500/80' : 'text-foreground/40'}`}>Erros encontrados</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <AlertCircle className="size-4 text-rose-500" /> Detalhes dos erros
                  </h4>
                  <ScrollArea className="h-48 border border-border rounded-xl">
                    <div className="p-4 space-y-2">
                      {result.errors.map((err, i) => (
                        <div key={i} className="text-xs flex items-start gap-3 bg-rose-500/5 p-2 rounded-lg border border-rose-500/10">
                          <span className="font-mono text-rose-500/60 shrink-0">Linha {err.row}</span>
                          <div className="flex-1">
                            <div className="font-medium text-foreground/80">{err.description}</div>
                            <div className="text-rose-500 mt-0.5">{err.error}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          ) : rows.length === 0 ? (
            <label className="group block border-2 border-dashed border-border rounded-2xl p-16 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all duration-300">
              <div className="size-16 bg-foreground/5 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <Upload className="size-8 text-foreground/40 group-hover:text-primary transition-colors" />
              </div>
              <div className="mt-6 text-base font-semibold">Selecione sua planilha .xlsx</div>
              <div className="text-sm text-foreground/50 mt-2 max-w-xs mx-auto">
                Arraste ou clique para buscar o arquivo. Certifique-se de que os dados estão na primeira aba.
              </div>
              <input
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                }}
              />
            </label>
          ) : (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-foreground/60 flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">{rows.length} linhas</Badge>
                  <span>Preview dos dados (primeiros 5 itens):</span>
                </div>
                <Button variant="ghost" size="sm" onClick={reset} className="h-7 text-xs gap-1.5">
                  <X className="size-3" /> Trocar arquivo
                </Button>
              </div>

              <div className="border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-foreground/5 border-bottom border-border">
                      <tr>
                        {headers.map((h) => (
                          <th key={h} className="px-4 py-3 font-semibold text-foreground/70 whitespace-nowrap border-r border-border/50 last:border-0">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 5).map((r, i) => (
                        <tr key={i} className="border-t border-border/50 hover:bg-foreground/[0.02] transition-colors">
                          {headers.map((h) => (
                            <td key={h} className="px-4 py-3 border-r border-border/50 last:border-0 truncate max-w-[150px]">
                              {String(r[h] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rows.length > 5 && (
                  <div className="bg-foreground/[0.03] px-4 py-2 text-[10px] text-center text-foreground/40 italic">
                    Exibindo 5 de {rows.length} linhas...
                  </div>
                )}
              </div>

              <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 space-y-2">
                <h5 className="text-xs font-bold text-blue-500 flex items-center gap-2">
                  <CheckCircle2 className="size-3.5" /> Detecção de Colunas
                </h5>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(mapping).map(([key, val]) => (
                    <div key={key} className="text-[10px] flex items-center justify-between bg-white/50 dark:bg-black/20 p-1.5 rounded-lg border border-border/40">
                      <span className="uppercase text-foreground/50 font-semibold">{key}:</span>
                      <span className={val ? "text-emerald-500 font-medium" : "text-rose-400"}>
                        {val || "Não encontrada"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="bg-foreground/5 p-6 flex flex-col sm:flex-row gap-3">
          {result ? (
            <Button onClick={reset} className="w-full sm:w-auto rounded-full px-8">
              Concluir
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto rounded-full">
                Cancelar
              </Button>
              <Button
                onClick={() => mut.mutate()}
                disabled={mut.isPending || rows.length === 0}
                className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8 gap-2"
              >
                {mut.isPending ? (
                  <>
                    <div className="size-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>Confirmar Importação</>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
