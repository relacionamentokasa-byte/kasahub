import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPartner, updatePartner, type PartnerType } from "@/lib/partners-api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";

const TYPE_LABEL: Record<PartnerType, string> = {
  representative: "Representante",
  freelancer: "Freelancer",
  supplier: "Fornecedor",
  strategic: "Parceiro estratégico",
};

export function PartnerDialog({
  open,
  onOpenChange,
  partner,
  type,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  partner?: any;
  type: PartnerType;
}) {
  const qc = useQueryClient();
  const isEdit = !!partner?.id;
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    document: "",
    pix_key: "",
    specialty: "",
    hourly_rate: "",
    observations: "",
    photo_url: "" as string | null | "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      name: partner?.name ?? "",
      email: partner?.email ?? "",
      phone: partner?.phone ?? "",
      document: partner?.document ?? "",
      pix_key: partner?.pix_key ?? "",
      specialty: partner?.specialty ?? "",
      hourly_rate: partner?.hourly_rate != null ? String(partner.hourly_rate) : "",
      observations: partner?.observations ?? "",
      photo_url: partner?.photo_url ?? "",
    });
  }, [open, partner]);


  const mut = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Nome é obrigatório");
      const payload: any = {
        name: form.name.trim(),
        type,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        document: form.document.trim() || null,
        pix_key: form.pix_key.trim() || null,
        specialty: form.specialty.trim() || null,
        hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate.replace(",", ".")) : null,
        observations: form.observations.trim() || null,
        photo_url: form.photo_url || null,
      };
      if (isEdit) return updatePartner(partner.id, payload);
      return createPartner(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partners"] });
      qc.invalidateQueries({ queryKey: ["partners", "freelancer"] });
      toast.success(isEdit ? "Parceiro atualizado" : "Parceiro cadastrado");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isFreelancer = type === "freelancer";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {isEdit ? "Editar" : "Novo"} {TYPE_LABEL[type]}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Cadastre os dados para vincular em jobs, comissões e lançamentos financeiros.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label>Foto</Label>
            <ImageUpload
              value={form.photo_url || null}
              onChange={(url) => setForm({ ...form, photo_url: url ?? "" })}
              folder="partners"
              label="Foto"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone / WhatsApp</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>CPF / CNPJ</Label>
              <Input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Chave PIX</Label>
              <Input value={form.pix_key} onChange={(e) => setForm({ ...form, pix_key: e.target.value })} />
            </div>
          </div>

          {isFreelancer && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Especialidade</Label>
                <Input
                  placeholder="Ex: Designer, Editor, Dev…"
                  value={form.specialty}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Valor/hora (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.hourly_rate}
                  onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea
              rows={3}
              value={form.observations}
              onChange={(e) => setForm({ ...form, observations: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isEdit ? "Salvar" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
