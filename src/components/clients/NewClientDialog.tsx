import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/ops-api";
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
import { toast } from "sonner";
import { ImageUpload } from "@/components/ui/image-upload";

export function NewClientDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    document: "",
    notes: "",
    logo_url: "" as string | null,
  });

  const mut = useMutation({
    mutationFn: () =>
      createClient({
        ...form,
        name: form.name || form.company || "Cliente sem nome",
        logo_url: form.logo_url || null,
      }),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente cadastrado");
      onOpenChange(false);
      setForm({ name: "", company: "", email: "", phone: "", document: "", notes: "", logo_url: "" });
      onCreated?.(c.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Novo cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Logo do cliente</Label>
            <ImageUpload
              value={form.logo_url}
              onChange={(url) => setForm({ ...form, logo_url: url })}
              folder="clients"
              label="Logo"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nome do contato</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Empresa</Label>
              <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Documento (CNPJ/CPF)</Label>
              <Input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Observações</Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || (!form.name && !form.company)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Cadastrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
