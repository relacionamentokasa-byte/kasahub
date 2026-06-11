import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { FileSpreadsheet, Upload, AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchClients, createClient } from "@/lib/ops-api";
import { createTransaction } from "@/lib/finance-api";

export function FinancialImportDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const lines = text.split("\n");
        const headers = lines[0].split(";").map(h => h.trim().toLowerCase());
        
        const data = lines.slice(1).filter(l => l.trim()).map(line => {
          const values = line.split(";").map(v => v.trim());
          const obj: any = {};
          headers.forEach((h, i) => {
            obj[h] = values[i];
          });
          return obj;
        });
        setPreview(data);
      };
      reader.readAsText(f);
    }
  };

  const runImport = async () => {
    if (!preview.length) return;
    setImporting(true);
    
    try {
      const clients = await fetchClients();
      let importedCount = 0;

      for (const row of preview) {
        // Find or create client
        let clientId = null;
        if (row.cliente) {
          const existing = clients.find(c => 
            c.company?.toLowerCase() === row.cliente.toLowerCase() || 
            c.name?.toLowerCase() === row.cliente.toLowerCase()
          );
          if (existing) {
            clientId = existing.id;
          } else {
            const newClient = await createClient({ 
              name: row.cliente, 
              company: row.cliente,
              status: 'active'
            });
            clientId = newClient.id;
          }
        }

        // Clean amount
        const amount = Number(row.valor?.replace("R$", "").replace(".", "").replace(",", ".").trim()) || 0;

        await createTransaction({
          description: row.descricao || "Importação",
          amount: amount,
          type: row.tipo?.toLowerCase() === "entrada" || row.tipo?.toLowerCase() === "income" ? "income" : "expense",
          status: row.status?.toLowerCase() === "pago" || row.status?.toLowerCase() === "paid" ? "paid" : "pending",
          due_date: row.data || new Date().toISOString().split("T")[0],
          client_id: clientId,
          payment_method: "Importação"
        });
        importedCount++;
      }

      toast.success(`${importedCount} lançamentos importados com sucesso!`);
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["finance-stats"] });
      onOpenChange(false);
      setFile(null);
      setPreview([]);
    } catch (e: any) {
      toast.error("Erro na importação: " + e.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-surface border-border p-0 overflow-hidden flex flex-col max-h-[85vh]">
        <DialogHeader className="p-6 border-b border-border bg-muted/20">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileSpreadsheet className="size-5 text-primary" /> Importar Financeiro
          </DialogTitle>
          <DialogDescription>
            Importe seu extrato de ERPs antigos (Conta Azul, Omie, Excel).
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {!file ? (
            <div className="border-2 border-dashed border-border rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4 hover:border-primary/50 transition-colors cursor-pointer relative group">
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Upload className="size-6" />
              </div>
              <div>
                <p className="font-bold text-sm">Clique ou arraste seu arquivo CSV</p>
                <p className="text-xs text-foreground/40 mt-1">Colunas: data; descricao; valor; tipo; cliente; categoria; status</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-muted/30 p-3 rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <FileSpreadsheet className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{file.name}</p>
                    <p className="text-[10px] text-foreground/40 uppercase font-mono-kasa">{preview.length} linhas detectadas</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setFile(null); setPreview([]); }} className="h-8 w-8 text-foreground/30">
                  <X className="size-4" />
                </Button>
              </div>

              <div className="border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="max-h-[300px] overflow-auto">
                  <table className="w-full text-[10px] uppercase font-mono-kasa">
                    <thead className="bg-muted/50 sticky top-0 border-b border-border">
                      <tr>
                        <th className="p-2 text-left">Data</th>
                        <th className="p-2 text-left">Descrição</th>
                        <th className="p-2 text-right">Valor</th>
                        <th className="p-2 text-left">Cliente</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {preview.slice(0, 10).map((row, i) => (
                        <tr key={i} className="hover:bg-muted/10">
                          <td className="p-2 text-foreground/60">{row.data || "—"}</td>
                          <td className="p-2 font-bold truncate max-w-[150px]">{row.descricao || "—"}</td>
                          <td className="p-2 text-right">{row.valor || "—"}</td>
                          <td className="p-2 text-primary">{row.cliente || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.length > 10 && (
                    <div className="p-2 text-center text-[10px] text-foreground/30 bg-muted/20 border-t border-border">
                      Exibindo as primeiras 10 de {preview.length} linhas.
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex gap-3">
                <AlertCircle className="size-5 text-amber-500 shrink-0" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-amber-500/90">Atenção ao Mapeamento</p>
                  <p className="text-[10px] text-foreground/50 leading-relaxed">
                    Clientes não encontrados na base serão criados automaticamente. Verifique se os nomes na planilha correspondem aos cadastrados para evitar duplicidade.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 border-t border-border bg-muted/20 gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={importing} className="rounded-full">
            Cancelar
          </Button>
          <Button 
            onClick={runImport} 
            disabled={!file || importing} 
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8 font-bold gap-2"
          >
            {importing ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            {importing ? "Importando..." : "Confirmar Importação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
