import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createLead, type Stage } from "@/lib/crm-api";
import { fetchPartners } from "@/lib/partners-api";
import { toast } from "sonner";

export function NewLeadDialog({
  stage,
  onOpenChange,
}: {
  stage: Stage;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    value: "",
    source: "",
    origin_partner_id: "",
    notes: "",
  });

  const { data: representatives = [] } = useQuery({
    queryKey: ["partners", "representative"],
    queryFn: () => fetchPartners("representative"),
  });

  const mut = useMutation({
    mutationFn: () =>
      createLead({
        name: form.name,
        company: form.company || null,
        email: form.email || null,
        phone: form.phone || null,
        value: form.value ? Number(form.value) : 0,
        source: form.source || null,
        origin_partner_id: form.source === 'Representante' ? form.origin_partner_id : null,
        stage_id: stage.id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "leads"] });
      toast.success("Lead criado");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            Novo lead · <span className="text-primary">{stage.name}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Nome *">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome do contato"
              autoFocus
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Empresa">
              <Input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </Field>
            <Field label="Origem">
              <Select 
                value={form.source} 
                onValueChange={(v) => setForm({ ...form, source: v })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Site">Site</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="Google">Google</SelectItem>
                  <SelectItem value="Indicação">Indicação</SelectItem>
                  <SelectItem value="Representante">Representante</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          {form.source === 'Representante' && (
            <Field label="Representante Responsável *">
              <Select 
                value={form.origin_partner_id} 
                onValueChange={(v) => setForm({ ...form, origin_partner_id: v })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione o representante" />
                </SelectTrigger>
                <SelectContent>
                  {representatives.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="E-mail">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Telefone / WhatsApp *">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(62) 99999-9999"
              />
            </Field>
          </div>
          <Field label="Valor estimado (R$)">
            <Input
              type="number"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              placeholder="0,00"
            />
          </Field>
          <Field label="Notas">
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!form.name || !form.phone || mut.isPending}
            onClick={() => mut.mutate()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
          >
            {mut.isPending ? "Criando…" : "Criar lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] capitalize text-foreground/60">
        {label}
      </Label>
      {children}
    </div>
  );
}
