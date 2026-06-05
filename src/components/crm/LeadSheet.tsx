import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addActivity,
  createProposal,
  deleteLead,
  fetchActivities,
  formatCurrency,
  updateLead,
  type Lead,
  type Stage,
} from "@/lib/crm-api";
import {
  FileText,
  Mail,
  MessageSquare,
  Phone,
  Trash2,
  Sparkles,
  Activity,
} from "lucide-react";
import { toast } from "sonner";

export function LeadSheet({
  lead,
  stages,
  onClose,
}: {
  lead: Lead | null;
  stages: Stage[];
  onClose: () => void;
}) {
  if (!lead) return null;
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl bg-surface border-border overflow-y-auto">
        <Inner lead={lead} stages={stages} onClose={onClose} />
      </SheetContent>
    </Sheet>
  );
}

function Inner({ lead, stages, onClose }: { lead: Lead; stages: Stage[]; onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState(lead);
  const [note, setNote] = useState("");
  const [noteType, setNoteType] = useState("note");

  const { data: activities = [] } = useQuery({
    queryKey: ["crm", "activities", lead.id],
    queryFn: () => fetchActivities(lead.id),
  });

  const saveMut = useMutation({
    mutationFn: () =>
      updateLead(lead.id, {
        name: form.name,
        company: form.company,
        email: form.email,
        phone: form.phone,
        value: form.value,
        source: form.source,
        notes: form.notes,
        stage_id: form.stage_id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "leads"] });
      toast.success("Lead atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: () => deleteLead(lead.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "leads"] });
      toast.success("Lead removido");
      onClose();
    },
  });

  const noteMut = useMutation({
    mutationFn: () => addActivity(lead.id, noteType, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "activities", lead.id] });
      setNote("");
    },
  });

  const proposalMut = useMutation({
    mutationFn: () =>
      createProposal({
        title: `Proposta · ${lead.company ?? lead.name}`,
        client_name: lead.company ?? lead.name,
        client_email: lead.email,
        lead_id: lead.id,
        intro: "Apresentação Kasa Marketing — escopo de serviços e investimento.",
      }),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Proposta gerada");
      navigate({ to: "/propostas/$proposalId", params: { proposalId: p.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <SheetHeader>
        <SheetTitle className="font-display text-2xl">{lead.name}</SheetTitle>
        {lead.company && <p className="text-sm text-foreground/60">{lead.company}</p>}
      </SheetHeader>

      <div className="mt-6 grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <F label="Nome">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </F>
          <F label="Empresa">
            <Input
              value={form.company ?? ""}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
          </F>
          <F label="E-mail">
            <Input
              value={form.email ?? ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </F>
          <F label="Telefone">
            <Input
              value={form.phone ?? ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </F>
          <F label="Valor (R$)">
            <Input
              type="number"
              value={String(form.value)}
              onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
            />
          </F>
          <F label="Origem">
            <Input
              value={form.source ?? ""}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
            />
          </F>
        </div>
        <F label="Etapa">
          <Select
            value={form.stage_id ?? undefined}
            onValueChange={(v) => setForm({ ...form, stage_id: v })}
          >
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {stages.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </F>
        <F label="Notas">
          <Textarea
            rows={3}
            value={form.notes ?? ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </F>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
          >
            Salvar alterações
          </Button>
          <Button
            variant="outline"
            onClick={() => proposalMut.mutate()}
            disabled={proposalMut.isPending}
            className="gap-2"
          >
            <Sparkles className="size-4 text-primary" /> Gerar proposta
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (confirm("Excluir este lead?")) delMut.mutate();
            }}
            className="ml-auto text-destructive hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>

        <div className="border-t border-border pt-5 mt-2">
          <h3 className="font-display font-semibold text-sm capitalize text-foreground/60 mb-3 flex items-center gap-2">
            <Activity className="size-4" /> Atividade
          </h3>
          <div className="flex gap-2 mb-3">
            <Select value={noteType} onValueChange={setNoteType}>
              <SelectTrigger className="w-32 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="note">Nota</SelectItem>
                <SelectItem value="call">Ligação</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="meeting">Reunião</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Registrar uma atividade…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && note.trim()) noteMut.mutate();
              }}
            />
            <Button
              onClick={() => note.trim() && noteMut.mutate()}
              disabled={!note.trim() || noteMut.isPending}
              size="sm"
            >
              Adicionar
            </Button>
          </div>
          <ul className="space-y-2">
            {activities.map((a) => (
              <li
                key={a.id}
                className="flex items-start gap-3 bg-background/50 border border-border rounded-lg p-3"
              >
                <ActivityIcon type={a.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground/90">{a.content}</p>
                  <p className="text-[10px] text-foreground/40 mt-1">
                    {new Date(a.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </li>
            ))}
            {activities.length === 0 && (
              <p className="text-xs text-foreground/40 text-center py-4">
                Nenhuma atividade registrada ainda.
              </p>
            )}
          </ul>
        </div>

        {Number(lead.value) > 0 && (
          <div className="text-xs text-foreground/50 pt-3 border-t border-border">
            Valor: <span className="text-primary">{formatCurrency(Number(lead.value))}</span>
          </div>
        )}
      </div>
    </>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] capitalize text-foreground/50">
        {label}
      </Label>
      {children}
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const Icon =
    type === "call" ? Phone : type === "email" ? Mail : type === "meeting" ? FileText : MessageSquare;
  return (
    <div className="size-7 rounded-md bg-primary/10 grid place-items-center shrink-0">
      <Icon className="size-3.5 text-primary" />
    </div>
  );
}
