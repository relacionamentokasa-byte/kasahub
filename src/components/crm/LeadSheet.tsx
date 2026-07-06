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
  CONTACT_STATUS_OPTIONS,
  TASK_TYPES,
  completeLeadTask,
  createLeadTask,
  deleteLeadTask,
  fetchLeadTasks,
  type LeadTask,
} from "@/lib/lead-tasks-api";
import {
  FileText,
  Mail,
  MessageSquare,
  Phone,
  Trash2,
  Sparkles,
  Activity,
  MessageCircle,
  MoreVertical,
  CheckSquare,
  Square,
  Bell,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  const { data: tasks = [] } = useQuery({
    queryKey: ["crm", "tasks", lead.id],
    queryFn: () => fetchLeadTasks(lead.id),
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
        contact_status: form.contact_status,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "leads"] });
      toast.success("Lead atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const contactStatusMut = useMutation({
    mutationFn: (status: string) =>
      updateLead(lead.id, { contact_status: status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "leads"] });
      toast.success("Status atualizado");
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
    mutationFn: (data?: { type?: string; content?: string }) => 
      addActivity(lead.id, data?.type || noteType, data?.content || note),
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
          <F label="Telefone / WhatsApp">
            <Input
              value={form.phone ?? ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(62) 99999-9999"
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
        <div className="grid grid-cols-2 gap-3">
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
          <F label="Status de contato">
            <Select
              value={form.contact_status ?? "not_contacted"}
              onValueChange={(v) => {
                setForm({ ...form, contact_status: v });
                contactStatusMut.mutate(v);
              }}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </F>
        </div>
        <F label="Notas">
          <Textarea
            rows={3}
            value={form.notes ?? ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </F>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-surface-elevated border border-border rounded-lg p-1 gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const phone = form.phone?.replace(/\D/g, "");
                if (phone) {
                  window.open(`https://wa.me/${phone.startsWith("55") ? phone : `55${phone}`}`, "_blank");
                  noteMut.mutate({ type: "whatsapp", content: "WhatsApp iniciado" });
                } else {
                  toast.error("Telefone não cadastrado");
                }
              }}
              className="h-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 gap-1.5"
            >
              <MessageCircle className="size-4" /> WhatsApp
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <MoreVertical className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => {
                  const text = `Olá, ${form.name}. Vi seu interesse em nossos serviços e gostaria de entender melhor sua necessidade.`;
                  const phone = form.phone?.replace(/\D/g, "");
                  if (phone) {
                    window.open(`https://wa.me/${phone.startsWith("55") ? phone : `55${phone}`}?text=${encodeURIComponent(text)}`, "_blank");
                    noteMut.mutate({ type: "whatsapp", content: "Apresentação via WhatsApp" });
                  }
                }}>Apresentação</DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  const text = `Olá, ${form.name}. Passando para verificar se conseguiu analisar nossa proposta.`;
                  const phone = form.phone?.replace(/\D/g, "");
                  if (phone) {
                    window.open(`https://wa.me/${phone.startsWith("55") ? phone : `55${phone}`}?text=${encodeURIComponent(text)}`, "_blank");
                    noteMut.mutate({ type: "whatsapp", content: "Follow-up via WhatsApp" });
                  }
                }}>Follow-up</DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  const text = `Olá, ${form.name}. Gostaria de confirmar nossa reunião agendada para hoje.`;
                  const phone = form.phone?.replace(/\D/g, "");
                  if (phone) {
                    window.open(`https://wa.me/${phone.startsWith("55") ? phone : `55${phone}`}?text=${encodeURIComponent(text)}`, "_blank");
                    noteMut.mutate({ type: "whatsapp", content: "Reunião via WhatsApp" });
                  }
                }}>Confirmar Reunião</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (form.email) window.location.href = `mailto:${form.email}`;
            }}
            className="h-9 gap-1.5"
          >
            <Mail className="size-4" /> E-mail
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (form.phone) window.location.href = `tel:${form.phone}`;
            }}
            className="h-9 gap-1.5"
          >
            <Phone className="size-4" /> Ligar
          </Button>
        </div>

        <div className="flex items-center gap-2 pt-2">
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

        <TasksSection leadId={lead.id} tasks={tasks} />

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
                if (e.key === "Enter" && note.trim()) noteMut.mutate({ content: note, type: noteType });
              }}
            />
            <Button
              onClick={() => note.trim() && noteMut.mutate({ content: note, type: noteType })}
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
    type === "call" ? Phone : type === "email" ? Mail : type === "meeting" ? FileText : type === "whatsapp" ? MessageCircle : MessageSquare;
  return (
    <div className={cn(
      "size-7 rounded-md grid place-items-center shrink-0",
      type === "whatsapp" ? "bg-emerald-500/10" : "bg-primary/10"
    )}>
      <Icon className={cn("size-3.5", type === "whatsapp" ? "text-emerald-500" : "text-primary")} />
    </div>
  );
}
