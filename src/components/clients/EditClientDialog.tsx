import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateClient, deleteClient } from "@/lib/ops-api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

type Client = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  document: string | null;
  notes: string | null;
  logo_url: string | null;
  brand_primary: string | null;
};

export function EditClientDialog({
  client,
  open,
  onOpenChange,
}: {
  client: Client;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: client.name ?? "",
    company: client.company ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    document: client.document ?? "",
    notes: client.notes ?? "",
    logo_url: (client.logo_url ?? "") as string | null,
    brand_primary: client.brand_primary ?? "#FFBC45",
  });

  useEffect(() => {
    if (open) {
      setForm({
        name: client.name ?? "",
        company: client.company ?? "",
        email: client.email ?? "",
        phone: client.phone ?? "",
        document: client.document ?? "",
        notes: client.notes ?? "",
        logo_url: client.logo_url ?? "",
        brand_primary: client.brand_primary ?? "#FFBC45",
      });
    }
  }, [open, client]);

  const mut = useMutation({
    mutationFn: () =>
      updateClient(client.id, {
        ...form,
        logo_url: form.logo_url || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", client.id] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente atualizado");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: () => deleteClient(client.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente removido");
      onOpenChange(false);
      navigate({ to: "/clientes" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Editar cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Logo</Label>
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
              <Label>Cor da marca</Label>
              <div className="flex gap-2">
                <Input type="color" value={form.brand_primary} onChange={(e) => setForm({ ...form, brand_primary: e.target.value })} className="w-16 p-1 h-10" />
                <Input value={form.brand_primary} onChange={(e) => setForm({ ...form, brand_primary: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Observações</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter className="flex-row sm:justify-between gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              if (confirm("Remover este cliente? Esta ação não pode ser desfeita.")) del.mutate();
            }}
            disabled={del.isPending}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-4 mr-1" /> Excluir
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              onClick={() => mut.mutate()}
              disabled={mut.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
