import { useState, useRef, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { Camera, Loader2, Landmark, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const BR_BANKS = [
  { name: "Banco Inter", logo: "https://upload.wikimedia.org/wikipedia/pt/thumb/a/a9/Logo_Banco_Inter.png/300px-Logo_Banco_Inter.png" },
  { name: "Nubank", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Nubank_logo_2021.svg/1200px-Nubank_logo_2021.svg.png" },
  { name: "Itaú", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Itau_Unibanco_logo.svg/1200px-Itau_Unibanco_logo.svg.png" },
  { name: "Bradesco", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Bradesco_Logo.svg/1200px-Bradesco_Logo.svg.png" },
  { name: "Caixa", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Logo_CAIXA.svg/1200px-Logo_CAIXA.svg.png" },
  { name: "Banco do Brasil", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Logotipo_do_Banco_do_Brasil.svg/1200px-Logotipo_do_Banco_do_Brasil.svg.png" },
  { name: "Santander", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Logo_Santander_2018.svg/1200px-Logo_Santander_2018.svg.png" },
  { name: "Sicoob", logo: "https://logodownload.org/wp-content/uploads/2017/02/sicoob-logo-0.png" },
  { name: "C6 Bank", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Logo_C6_Bank.svg/1200px-Logo_C6_Bank.svg.png" },
  { name: "BTG Pactual", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/BTG_Pactual_logo.svg/1200px-BTG_Pactual_logo.svg.png" },
  { name: "XP Investimentos", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/XP_Investimentos_Logo.svg/1200px-XP_Investimentos_Logo.svg.png" }
];

export function NewBankAccountDialog({
  open,
  onOpenChange,
  bankAccount,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  bankAccount?: any;
}) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    bank: "",
    agency: "",
    account_number: "",
    account_type: "checking",
    initial_balance: "0",
    color: "#FFBC45",
    bank_logo_url: "",
  });

  useEffect(() => {
    if (open && bankAccount) {
      setForm({
        name: bankAccount.name || "",
        bank: bankAccount.bank || "",
        agency: bankAccount.agency || "",
        account_number: bankAccount.account_number || "",
        account_type: bankAccount.account_type || "checking",
        initial_balance: String(bankAccount.initial_balance || "0"),
        color: bankAccount.color || "#FFBC45",
        bank_logo_url: bankAccount.bank_logo_url || "",
      });
    } else if (open && !bankAccount) {
      setForm({ name: "", bank: "", agency: "", account_number: "", account_type: "checking", initial_balance: "0", color: "#FFBC45", bank_logo_url: "" });
    }
  }, [open, bankAccount]);

  const mut = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        bank: form.bank || null,
        agency: form.agency || null,
        account_number: form.account_number || null,
        account_type: form.account_type,
        initial_balance: Number(form.initial_balance) || 0,
        color: form.color,
        bank_logo_url: form.bank_logo_url || null,
      };
      if (bankAccount?.id) {
        return supabase.from("bank_accounts").update(payload as any).eq("id", bankAccount.id);
      }
      return createBankAccount(payload as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank_accounts"] });
      toast.success(bankAccount ? "Conta atualizada" : "Conta criada");
      onOpenChange(false);
      setForm({ name: "", bank: "", agency: "", account_number: "", account_type: "checking", initial_balance: "0", color: "#FFBC45", bank_logo_url: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `bank-logos/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('financial-assets').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('financial-assets').getPublicUrl(filePath);
      setForm(prev => ({ ...prev, bank_logo_url: publicUrl }));
      toast.success("Logo enviada");
    } catch (error: any) {
      toast.error("Erro no upload: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border max-w-lg overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{bankAccount ? "Editar conta bancária" : "Nova conta bancária"}</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative group">
            <Avatar className="size-20 border-2 border-primary/20 shadow-xl bg-background">
              <AvatarImage src={form.bank_logo_url} className="object-contain p-2" />
              <AvatarFallback className="bg-surface"><Landmark className="size-8 text-foreground/20" /></AvatarFallback>
            </Avatar>
            <Button 
              size="icon" 
              variant="outline" 
              className="absolute -bottom-1 -right-1 size-8 rounded-full bg-surface border-border"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            </Button>
            {form.bank_logo_url && (
              <Button 
                size="icon" 
                variant="destructive" 
                className="absolute -top-1 -right-1 size-6 rounded-full"
                onClick={() => setForm(p => ({ ...p, bank_logo_url: "" }))}
              >
                <X className="size-3" />
              </Button>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpload} />
          </div>
          <p className="text-[10px] uppercase font-mono-kasa text-foreground/40 font-bold">Logo do Banco</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5 col-span-2">
            <Label>Instituição Bancária</Label>
            <Select 
              value={BR_BANKS.some(b => b.name === form.bank) ? form.bank : (form.bank ? "Outro" : "")}
              onValueChange={(v) => {
                if (v === "Outro") {
                   setForm(p => ({ ...p, bank: "Outro" }));
                } else {
                  const bank = BR_BANKS.find(b => b.name === v);
                  setForm(p => ({ ...p, bank: v, bank_logo_url: bank?.logo || p.bank_logo_url }));
                }
              }}
            >
              <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione o banco" /></SelectTrigger>
              <SelectContent>
                {BR_BANKS.map(b => <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>)}
                <SelectItem value="Outro">Outro banco</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.bank === "Outro" && (
            <div className="space-y-1.5 col-span-2">
              <Label>Nome do Banco</Label>
              <Input 
                value={form.bank === "Outro" ? "" : form.bank} 
                onChange={(e) => setForm({ ...form, bank: e.target.value })} 
                placeholder="Digite o nome do banco" 
              />
            </div>
          )}
          <div className="space-y-1.5 col-span-2">
            <Label>Nome da conta (Exibição)</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Conta Principal" />
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
            <Label>Saldo inicial (R$)</Label>
            <Input type="number" step="0.01" value={form.initial_balance} onChange={(e) => setForm({ ...form, initial_balance: e.target.value })} />
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
            <Label>Cor de destaque</Label>
            <Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 p-1 bg-background" />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !form.name}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {bankAccount ? "Salvar alterações" : "Criar conta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
