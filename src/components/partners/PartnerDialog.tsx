import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPartner, updatePartner, type PartnerType } from "@/lib/partners-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Users2, Loader2 } from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";

const TYPE_LABEL: Record<PartnerType, string> = {
  representative: "Representante",
  freelancer: "Freelancer",
  supplier: "Fornecedor",
  strategic: "Parceiro Estratégico",
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
      toast.success(isEdit ? "Parceiro atualizado com sucesso!" : "Parceiro cadastrado com sucesso!");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isFreelancer = type === "freelancer";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight">
            <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Users2 className="size-5" />
            </div>
            <span>{isEdit ? "Editar" : "Novo"} {TYPE_LABEL[type]}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Cadastre os dados para vincular em jobs, comissões e lançamentos financeiros.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 pt-1">
          <div className="flex flex-col items-center gap-2 py-1">
            <ImageUpload
              value={form.photo_url || null}
              onChange={(url) => setForm({ ...form, photo_url: url ?? "" })}
              folder="partners"
              label="Foto do Parceiro"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
              Nome Completo / Razão Social *
            </Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-9 text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                E-mail
              </Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Telefone / WhatsApp
              </Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="h-9 text-xs font-mono-kasa tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                CPF / CNPJ
              </Label>
              <Input
                value={form.document}
                onChange={(e) => setForm({ ...form, document: e.target.value })}
                className="h-9 text-xs font-mono-kasa tabular-nums"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Chave PIX
              </Label>
              <Input
                value={form.pix_key}
                onChange={(e) => setForm({ ...form, pix_key: e.target.value })}
                className="h-9 text-xs font-mono-kasa"
              />
            </div>
          </div>

          {isFreelancer && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                  Especialidade
                </Label>
                <Input
                  placeholder="Ex: Designer, Editor, Dev…"
                  value={form.specialty}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                  Valor/Hora (R$)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.hourly_rate}
                  onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })}
                  className="h-9 text-xs font-mono-kasa tabular-nums"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
              Observações
            </Label>
            <Textarea
              rows={3}
              value={form.observations}
              onChange={(e) => setForm({ ...form, observations: e.target.value })}
              className="text-xs resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-9 text-xs"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !form.name.trim()}
            className="h-9 text-xs font-medium gap-1.5"
          >
            {mut.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Users2 className="size-3.5" />}
            {isEdit ? "Salvar Alterações" : "Cadastrar Parceiro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
