import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createLead, LEAD_SOURCES, type Stage } from "@/lib/crm-api";
import { fetchPartners } from "@/lib/partners-api";
import { toast } from "sonner";
import { Target, Loader2 } from "lucide-react";

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
    queryKey: ["partners"],
    queryFn: () => fetchPartners(),
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
        origin_partner_id: form.source === "Representante" ? form.origin_partner_id : null,
        stage_id: stage.id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "leads"] });
      toast.success("Oportunidade criada com sucesso!");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight">
            <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Target className="size-5" />
            </div>
            <div className="flex items-center gap-2">
              <span>Nova Oportunidade</span>
              <span className="text-xs font-normal text-muted-foreground">•</span>
              <span
                className="text-xs px-2 py-0.5 rounded-md font-mono-kasa font-medium text-foreground/80 border border-border/80"
                style={{ borderLeftColor: stage.color || "#888", borderLeftWidth: "3px" }}
              >
                {stage.name}
              </span>
            </div>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Cadastre um novo lead e direcione para a etapa do funil comercial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 pt-1">
          <Field label="Título da Oportunidade *">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Branding & Posicionamento"
              className="h-9 text-xs"
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Empresa / Marca">
              <Input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Nome da marca ou negócio"
                className="h-9 text-xs"
              />
            </Field>

            <Field label="Origem do Lead">
              <Select
                value={form.source}
                onValueChange={(v) => setForm({ ...form, source: v })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {form.source === "Representante" && (
            <Field label="Representante Responsável *">
              <Select
                value={form.origin_partner_id}
                onValueChange={(v) => setForm({ ...form, origin_partner_id: v })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione o parceiro" />
                </SelectTrigger>
                <SelectContent>
                  {representatives.map((r: any) => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Contato / WhatsApp *">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(62) 99999-9999"
                className="h-9 text-xs font-mono-kasa tabular-nums"
              />
            </Field>
            <Field label="E-mail de Contato">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="contato@empresa.com"
                className="h-9 text-xs"
              />
            </Field>
          </div>

          <Field label="Valor Estimado da Oportunidade">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono-kasa text-muted-foreground">
                R$
              </span>
              <Input
                type="number"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder="0,00"
                className="h-9 text-xs pl-8 font-mono-kasa tabular-nums font-semibold"
              />
            </div>
          </Field>

          <Field label="Notas Iniciais / Briefing Rápido">
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Detalhes ou necessidades identificadas no primeiro contato…"
              className="text-xs resize-none"
            />
          </Field>
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
            disabled={!form.name || !form.phone || mut.isPending}
            onClick={() => mut.mutate()}
            className="h-9 text-xs font-medium gap-1.5"
          >
            {mut.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Target className="size-3.5" />}
            Criar Oportunidade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </Label>
      {children}
    </div>
  );
}
