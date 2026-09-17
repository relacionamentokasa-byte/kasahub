import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  FileSpreadsheet, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  X,
  ArrowRight,
  Database,
  Search
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchClients, createClient } from "@/lib/ops-api";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import Papa from "papaparse";
import * as XLSX from "xlsx";

type MappingField = "due_date" | "description" | "amount" | "type" | "category" | "status";

interface ColumnMapping {
  systemField: MappingField;
  label: string;
  spreadsheetColumn: string;
}

const SYSTEM_FIELDS: { value: MappingField; label: string }[] = [
  { value: "due_date", label: "Data de Vencimento" },
  { value: "description", label: "Descrição / Nome do Cliente" },
  { value: "amount", label: "Valor" },
  { value: "type", label: "Tipo (Receita/Despesa)" },
  { value: "category", label: "Categoria" },
  { value: "status", label: "Status (Pago/Pendente)" },
];

export function FinancialImportDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<"upload" | "mapping" | "processing">("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [mappings, setMappings] = useState<Record<MappingField, string>>({
    due_date: "",
    description: "",
    amount: "",
    type: "",
    category: "",
    status: "",
  });
  const [progress, setProgress] = useState(0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const extension = f.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(extension || "")) {
      toast.error("Formato de arquivo não suportado. Use .csv, .xlsx ou .xls");
      return;
    }

    setFile(f);
    
    if (extension === "csv") {
      Papa.parse(f, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.meta.fields) {
            setHeaders(results.meta.fields);
            setData(results.data);
            autoMapColumns(results.meta.fields);
            setStep("mapping");
          }
        },
        error: (err) => {
          toast.error("Erro ao ler arquivo CSV: " + err.message);
        }
      });
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const bstr = ev.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        if (json.length > 0) {
          const sheetHeaders = json[0] as string[];
          const sheetData = XLSX.utils.sheet_to_json(ws);
          setHeaders(sheetHeaders);
          setData(sheetData);
          autoMapColumns(sheetHeaders);
          setStep("mapping");
        }
      };
      reader.readAsBinaryString(f);
    }
  };

  const autoMapColumns = (detectedHeaders: string[]) => {
    const newMappings = { ...mappings };
    const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    
    detectedHeaders.forEach(header => {
      const normalized = normalize(header);
      if (normalized.includes("data") || normalized.includes("vencimento")) newMappings.due_date = header;
      if (normalized.includes("descricao") || normalized.includes("cliente") || normalized.includes("titulo")) newMappings.description = header;
      if (normalized.includes("valor") || normalized.includes("preco") || normalized.includes("montante")) newMappings.amount = header;
      if (normalized.includes("tipo") || normalized.includes("natureza")) newMappings.type = header;
      if (normalized.includes("categoria")) newMappings.category = header;
      if (normalized.includes("status") || normalized.includes("situacao")) newMappings.status = header;
    });
    setMappings(newMappings);
  };

  const handleMappingChange = (field: MappingField, value: string) => {
    setMappings(prev => ({ ...prev, [field]: value }));
  };

  const parseDate = (dateStr: any) => {
    if (!dateStr) return new Date().toISOString().split("T")[0];
    // Se for um número (excel date)
    if (typeof dateStr === "number") {
      const date = XLSX.utils.format_cell({ v: dateStr, t: 'd' });
      return new Date(date).toISOString().split("T")[0];
    }
    
    // Tentar formatos comuns DD/MM/YYYY ou YYYY-MM-DD
    const parts = String(dateStr).split(/[\/\-]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return new Date(dateStr).toISOString().split("T")[0] || new Date().toISOString().split("T")[0];
  };

  const parseAmount = (amountStr: any) => {
    if (typeof amountStr === "number") return amountStr;
    if (!amountStr) return 0;
    const cleaned = String(amountStr).replace("R$", "").replace(/\./g, "").replace(",", ".").trim();
    return parseFloat(cleaned) || 0;
  };

  const runImport = async () => {
    // Validar se todos os campos essenciais estão mapeados
    if (!mappings.due_date || !mappings.description || !mappings.amount) {
      toast.error("Por favor, mapeie pelo menos Data, Descrição e Valor.");
      return;
    }

    setImporting(true);
    setStep("processing");
    setProgress(0);
    
    try {
      const clients = await fetchClients();
      const transactionsToInsert: any[] = [];
      let currentProgress = 0;

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        
        // Data
        const dueDate = parseDate(row[mappings.due_date]);
        
        // Descrição e Cliente
        const description = String(row[mappings.description] || "Importação");
        let clientId = null;
        
        // Tentar encontrar cliente pelo nome na descrição
        const matchedClient = clients.find(c => 
          (c.company && description.toLowerCase().includes(c.company.toLowerCase())) || 
          (c.name && description.toLowerCase().includes(c.name.toLowerCase()))
        );
        if (matchedClient) clientId = matchedClient.id;

        // Valor
        const amount = parseAmount(row[mappings.amount]);

        // Tipo
        let type = "expense";
        const typeStr = String(row[mappings.type] || "").toLowerCase();
        if (typeStr.includes("receita") || typeStr.includes("entrada") || typeStr.includes("income") || typeStr.includes("venda")) {
          type = "income";
        }

        // Status
        let status = "pending";
        const statusStr = String(row[mappings.status] || "").toLowerCase();
        if (statusStr.includes("pago") || statusStr.includes("recebido") || statusStr.includes("liquidado") || statusStr.includes("paid")) {
          status = "paid";
        }

        transactionsToInsert.push({
          description,
          amount,
          valor_previsto: amount,
          type,
          status,
          due_date: dueDate,
          client_id: clientId,
          category: row[mappings.category] || "Geral",
          payment_method: "Importação ERP",
          payment_date: status === "paid" ? dueDate : null
        });

        // Atualizar progresso visual a cada 10%
        if (i % Math.max(1, Math.floor(data.length / 10)) === 0) {
          setProgress(Math.round((i / data.length) * 100));
        }
      }

      // Inserção em lote no Supabase
      const { error } = await supabase.from("transactions").insert(transactionsToInsert);
      
      if (error) throw error;

      toast.success(`${transactionsToInsert.length} lançamentos importados com sucesso!`);
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["contas_bancarias"] });
      qc.invalidateQueries({ queryKey: ["finance-stats"] });
      onOpenChange(false);
      resetState();
    } catch (e: any) {
      console.error("Erro na importação:", e);
      toast.error("Erro na importação: " + (e.message || "Erro desconhecido"));
      setStep("mapping");
    } finally {
      setImporting(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setStep("upload");
    setData([]);
    setHeaders([]);
    setMappings({
      due_date: "",
      description: "",
      amount: "",
      type: "",
      category: "",
      status: "",
    });
    setProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!importing) onOpenChange(val);
    }}>
      <DialogContent className="sm:max-w-2xl bg-card border-border/80 p-0 overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
        <DialogHeader className="p-6 border-b border-border/70 bg-muted/20">
          <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight">
            <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <FileSpreadsheet className="size-5" />
            </div>
            <span>Importar Lançamentos Financeiros</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Siga os passos para importar dados de planilhas Excel (.xlsx, .xls) ou CSV.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 flex-1 overflow-y-auto">
          {step === "upload" && (
            <div
              className="border-2 border-dashed border-border/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4 hover:border-primary/50 hover:bg-muted/20 transition-all cursor-pointer relative group"
            >
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="size-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <Upload className="size-7" />
              </div>
              <div className="space-y-1.5">
                <p className="font-semibold text-sm text-foreground">Arraste sua planilha ou clique para selecionar</p>
                <p className="text-xs text-muted-foreground font-mono-kasa">Suporta formatos .CSV, .XLSX e .XLS</p>
              </div>
            </div>
          )}

          {step === "mapping" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between bg-muted/30 p-3.5 rounded-xl border border-border/70">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                    <FileSpreadsheet className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate text-foreground">{file?.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono-kasa tabular-nums">{data.length} registros encontrados</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={resetState} className="text-xs text-muted-foreground hover:text-destructive h-8">
                  Alterar arquivo
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Database className="size-3.5 text-primary" />
                  <span>Mapeamento de Colunas (De-Para)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SYSTEM_FIELDS.map((field) => (
                    <div key={field.value} className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
                      <Select
                        value={mappings[field.value]}
                        onValueChange={(val) => handleMappingChange(field.value, val)}
                      >
                        <SelectTrigger className="bg-background border-border/70 h-9 text-xs">
                          <SelectValue placeholder="Selecione a coluna..." />
                        </SelectTrigger>
                        <SelectContent>
                          {headers.map(h => (
                            <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 flex gap-3 items-start">
                <AlertCircle className="size-4 text-primary shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-primary">Dica de Importação</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Mapeamos as colunas automaticamente com base no cabeçalho. Confira se os campos de Data, Descrição e Valor estão corretos antes de prosseguir.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === "processing" && (
            <div className="py-12 flex flex-col items-center justify-center space-y-5">
              <div className="relative">
                <Loader2 className="size-14 text-primary animate-spin opacity-20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <CheckCircle2 className="size-7 text-primary animate-pulse" />
                </div>
              </div>
              <div className="text-center space-y-2 w-full max-w-xs">
                <p className="font-semibold text-sm">Processando Importação...</p>
                <Progress value={progress} className="h-1.5" />
                <p className="text-[11px] text-muted-foreground font-mono-kasa tabular-nums tracking-widest">{progress}% concluído</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-border/70 bg-muted/20 flex flex-row items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={importing}
            className="text-xs h-9"
          >
            Cancelar
          </Button>

          {step === "mapping" && (
            <Button
              size="sm"
              onClick={runImport}
              disabled={importing}
              className="text-xs h-9 font-medium gap-1.5"
            >
              {importing ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowRight className="size-3.5" />}
              Processar Importação
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

