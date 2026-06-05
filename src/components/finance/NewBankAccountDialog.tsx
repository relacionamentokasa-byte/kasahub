import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBankAccount } from "@/lib/finance-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export function NewBankAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    bank: "",
    agency: "",
    account_number: "",
    account_type: "checking",
    initial_balance: "0",
    color: "#FFBC45",
  });

  const mut = useMutation({
    mutationFn: () =>
      createBankAccount({
        name: form.name,
        bank: form.bank || null,
        agency: form.agency || null,
        account_number: form.account_number || null,
        account_type: form.account_type,
        initial_balance: Number(form.initial_balance) || 0,
        color: form.color,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank_accounts"] });
      toast.success("Conta criada");
      onOpenChange(false);
      setForm({ name: "", bank: "", agency: "", account_number: "", account_type: "checking", initial_balance: "0", color: "#FFBC45" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Nova conta bancária</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2">
            <Label>Nome da conta</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Sicredi PJ" />
          </div>
          <div className="space-y-1.5">
            <Label>Banco</Label>
            <Input value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} placeholder="Ex.: Nubank, Sicredi, Cora" />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={form.account_type} onValueChange={(v) => setForm({ ...form, account_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">Conta corrente</SelectItem>
                <SelectItem value="savings">Poupança</SelectItem>
                <SelectItem value="digital">Conta digital</SelectItem>
                <SelectItem value="cash">Caixa</SelectItem>
                <SelectItem value="investment">Investimento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Agência</Label>
            <Input value={form.agency} onChange={(e) => setForm({ ...form, agency: e.target.value })} placeholder="0001" />
          </div>
          <div className="space-y-1.5">
            <Label>Conta</Label>
            <Input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} placeholder="12345-6" />
          </div>
          <div className="space-y-1.5">
            <Label>Saldo inicial (R$)</Label>
            <Input type="number" step="0.01" value={form.initial_balance} onChange={(e) => setForm({ ...form, initial_balance: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Cor</Label>
            <Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 p-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !form.name}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Criar conta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
