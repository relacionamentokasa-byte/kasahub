import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTransaction,
  fetchBankAccounts,
  fetchCategories,
} from "@/lib/finance-api";
import { fetchClients } from "@/lib/ops-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export function NewTransactionDialog({
  open,
  onOpenChange,
  defaultKind = "income",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultKind?: "income" | "expense";
}) {
  const qc = useQueryClient();
  const { data: accounts = [] } = useQuery({ queryKey: ["bank_accounts"], queryFn: fetchBankAccounts });
  const { data: categories = [] } = useQuery({ queryKey: ["financial_categories"], queryFn: fetchCategories });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });

  const [form, setForm] = useState({
    kind: defaultKind as "income" | "expense",
    description: "",
    amount: "",
    due_date: new Date().toISOString().slice(0, 10),
    account_id: "",
    category_id: "",
    client_id: "",
    notes: "",
    paid: false,
    installments: 1,
  });

  const filteredCats = categories.filter((c) => c.kind === form.kind);

  const mut = useMutation({
    mutationFn: () =>
      createTransaction(
        {
          kind: form.kind,
          description: form.description,
          amount: Number(form.amount) || 0,
          due_date: form.due_date,
          account_id: form.account_id || null,
          category_id: form.category_id || null,
          client_id: form.client_id || null,
          notes: form.notes || null,
          status: form.paid ? "paid" : "pending",
          paid_at: form.paid ? form.due_date : null,
        },
        form.installments,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Lançamento criado");
      onOpenChange(false);
      setForm({
        kind: defaultKind,
        description: "",
        amount: "",
        due_date: new Date().toISOString().slice(0, 10),
        account_id: "",
        category_id: "",
        client_id: "",
        notes: "",
        paid: false,
        installments: 1,
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Novo lançamento</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => setForm({ ...form, kind: "income", category_id: "" })}
            className={`flex-1 h-10 rounded-lg border text-sm font-semibold transition ${form.kind === "income" ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300" : "border-border text-foreground/60 hover:border-foreground/30"}`}
          >
            Receita
          </button>
          <button
            type="button"
            onClick={() => setForm({ ...form, kind: "expense", category_id: "" })}
            className={`flex-1 h-10 rounded-lg border text-sm font-semibold transition ${form.kind === "expense" ? "bg-rose-500/15 border-rose-500/40 text-rose-300" : "border-border text-foreground/60 hover:border-foreground/30"}`}
          >
            Despesa
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2">
            <Label>Descrição</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex.: Mensalidade Cliente X" />
          </div>
          <div className="space-y-1.5">
            <Label>Valor (R$)</Label>
            <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Vencimento</Label>
            <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Conta bancária</Label>
            <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {filteredCats.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {form.kind === "income" && (
            <div className="space-y-1.5 col-span-2">
              <Label>Cliente</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="Sem cliente" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Parcelas</Label>
            <Input type="number" min={1} max={36} value={form.installments} onChange={(e) => setForm({ ...form, installments: Math.max(1, Number(e.target.value) || 1) })} />
          </div>
          <div className="flex items-end gap-3 pb-1">
            <div className="flex items-center gap-2">
              <Switch checked={form.paid} onCheckedChange={(v) => setForm({ ...form, paid: v })} />
              <Label className="cursor-pointer">Já pago/recebido</Label>
            </div>
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Observações</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !form.description || !form.amount}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Lançar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
