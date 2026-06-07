import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  bulkInsertTransactions,
  fetchBankAccounts,
  fetchCategories,
} from "@/lib/finance-api";
import { fetchClients } from "@/lib/ops-api";
import { Upload, FileSpreadsheet } from "lucide-react";

type Row = Record<string, string | number | undefined | null>;

function parseDate(v: unknown, XLSX: any): string | null {
  if (!v) return null;
  if (typeof v === "number") {
    // Excel serial
    const d = XLSX.SSF.parse_date_code(v);
    if (d) {
      const dt = new Date(Date.UTC(d.y, d.m - 1, d.d));
      return dt.toISOString().slice(0, 10);
    }
  }
  const s = String(v).trim();
  // dd/mm/yyyy
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function parseAmount(v: unknown): number {
  if (typeof v === "number") return v;
  if (!v) return 0;
  const s = String(v).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

const FIELDS = [
  { key: "description", label: "Descrição*" },
  { key: "amount", label: "Valor*" },
  { key: "due_date", label: "Vencimento*" },
  { key: "kind", label: "Tipo (receita/despesa)" },
  { key: "status", label: "Status (pago/pendente)" },
  { key: "client", label: "Cliente (nome)" },
  { key: "category", label: "Categoria (nome)" },
  { key: "account", label: "Conta (nome)" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

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
  const [mapping, setMapping] = useState<Record<FieldKey, string>>({
    description: "",
    amount: "",
    due_date: "",
    kind: "",
    status: "",
    client: "",
    category: "",
    account: "",
  });
  const [defaultKind, setDefaultKind] = useState<"income" | "expense">("expense");

  const onFile = async (file: File) => {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Row>(sheet, { defval: "" });
    if (json.length === 0) {
      toast.error("Arquivo vazio");
      return;
    }
    const hdrs = Object.keys(json[0]);
    setHeaders(hdrs);
    setRows(json);
    // auto-map by heuristic
    const guess = (target: string[]): string => {
      const lower = hdrs.map((h) => h.toLowerCase());
      for (const t of target) {
        const i = lower.findIndex((h) => h.includes(t));
        if (i >= 0) return hdrs[i];
      }
      return "";
    };
    setMapping({
      description: guess(["descri", "histor", "lanc"]),
      amount: guess(["valor", "amount", "total"]),
      due_date: guess(["venc", "data", "date"]),
      kind: guess(["tipo", "kind"]),
      status: guess(["status", "situa"]),
      client: guess(["cliente", "client"]),
      category: guess(["categ"]),
      account: guess(["conta", "banco", "account"]),
    });
  };

  const mut = useMutation({
    mutationFn: async () => {
      const XLSX = await import("xlsx");
      if (!mapping.description || !mapping.amount || !mapping.due_date) {
        throw new Error("Mapeie ao menos Descrição, Valor e Vencimento");
      }
      const clientByName = new Map(clients.map((c) => [(c.company || c.name).toLowerCase(), c.id]));
      const catByName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));
      const accByName = new Map(accounts.map((a) => [a.name.toLowerCase(), a.id]));

      const inserts = rows.map((r) => {
        const kindRaw = String(r[mapping.kind] ?? "").toLowerCase();
        const kind: "income" | "expense" = kindRaw.startsWith("rec") || kindRaw === "income" || kindRaw === "entrada"
          ? "income"
          : kindRaw.startsWith("desp") || kindRaw === "expense" || kindRaw === "saida" || kindRaw === "saída"
          ? "expense"
          : defaultKind;
        const statusRaw = String(r[mapping.status] ?? "").toLowerCase();
        const status = statusRaw.startsWith("pag") || statusRaw === "paid" ? "paid" : "pending";
        const due = parseDate(r[mapping.due_date], XLSX) ?? new Date().toISOString().slice(0, 10);
        const cName = String(r[mapping.client] ?? "").toLowerCase().trim();
        const catName = String(r[mapping.category] ?? "").toLowerCase().trim();
        const accName = String(r[mapping.account] ?? "").toLowerCase().trim();
        const cat = catByName.get(catName);
        return {
          kind,
          description: String(r[mapping.description] ?? "Importado"),
          amount: parseAmount(r[mapping.amount]),
          due_date: due,
          status,
          paid_at: status === "paid" ? due : null,
          client_id: clientByName.get(cName) ?? null,
          category_id: cat?.id ?? null,
          account_id: accByName.get(accName) ?? null,
        };
      }).filter((r) => r.amount > 0 && r.description);

      if (inserts.length === 0) throw new Error("Nenhuma linha válida encontrada");
      const data = await bulkInsertTransactions(inserts);
      return data.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success(`${count} lançamento(s) importado(s)`);
      onOpenChange(false);
      setRows([]);
      setHeaders([]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-primary" /> Importar lançamentos
          </DialogTitle>
          <DialogDescription>
            Aceita arquivos .csv, .xls ou .xlsx. Útil para migrar o histórico financeiro.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <label className="block border-2 border-dashed border-border rounded-2xl p-10 text-center cursor-pointer hover:border-primary/60 transition">
            <Upload className="size-8 mx-auto text-foreground/40" />
            <div className="mt-3 text-sm font-medium">Clique para selecionar planilha</div>
            <div className="text-xs text-foreground/50 mt-1">CSV, XLS ou XLSX · até 5 MB</div>
            <input
              type="file"
              accept=".csv,.xls,.xlsx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />
          </label>
        ) : (
          <div className="space-y-4">
            <div className="text-xs text-foreground/60">
              {rows.length} linha(s) detectada(s). Mapeie as colunas:
            </div>
            <div className="grid grid-cols-2 gap-3">
              {FIELDS.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label className="text-xs">{f.label}</Label>
                  <Select
                    value={mapping[f.key] || "__none__"}
                    onValueChange={(v) => setMapping({ ...mapping, [f.key]: v === "__none__" ? "" : v })}
                  >
                    <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Ignorar —</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 text-xs">
              <Label>Tipo padrão se não mapeado:</Label>
              <Select value={defaultKind} onValueChange={(v: "income" | "expense") => setDefaultKind(v)}>
                <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="border border-border rounded-xl max-h-48 overflow-auto text-xs">
              <table className="w-full">
                <thead className="bg-foreground/5">
                  <tr>{headers.slice(0, 6).map((h) => <th key={h} className="text-left px-2 py-1">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-t border-border/40">
                      {headers.slice(0, 6).map((h) => <td key={h} className="px-2 py-1 truncate max-w-[140px]">{String(r[h] ?? "")}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || rows.length === 0}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Importar {rows.length > 0 ? `${rows.length} linha(s)` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
