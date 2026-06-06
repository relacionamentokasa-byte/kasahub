import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileSignature, Loader2, User, Coins, Calendar, FileText, ScrollText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchProposal, fetchProposalItems, formatCurrency } from "@/lib/crm-api";
import { approveProposal } from "@/lib/proposal-approval";
import { ScopeRenderer } from "@/components/proposals/ScopeRenderer";
import { toast } from "sonner";

interface Props {
  proposalId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApproved?: () => void;
}

export function ProposalApprovalDialog({ proposalId, open, onOpenChange, onApproved }: Props) {
  const qc = useQueryClient();
  const [signature, setSignature] = useState("");

  const { data: proposal } = useQuery({
    queryKey: ["proposal", proposalId],
    queryFn: () => fetchProposal(proposalId!),
    enabled: !!proposalId && open,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["proposal", proposalId, "items"],
    queryFn: () => fetchProposalItems(proposalId!),
    enabled: !!proposalId && open,
  });

  const { data: agency } = useQuery({
    queryKey: ["agency_settings_min"],
    queryFn: async () => {
      const { data } = await supabase
        .from("agency_settings")
        .select("name, agency_signature_url")
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: open,
  });

  const total = useMemo(() => Number(proposal?.total ?? 0), [proposal]);
  const monthly = useMemo(() => Number(proposal?.monthly_investment ?? 0), [proposal]);
  const oneTime = useMemo(() => Number(proposal?.one_time_investment ?? 0), [proposal]);

  const approveMut = useMutation({
    mutationFn: async () => {
      if (!proposalId) throw new Error("Proposta inválida");
      if (signature.trim().length < 2) throw new Error("Informe a assinatura do cliente");
      return approveProposal(supabase, proposalId, { acceptedName: signature.trim() });
    },
    onSuccess: () => {
      toast.success("Proposta aprovada e convertida em contrato, projeto, jobs e financeiro.");
      qc.invalidateQueries();
      onOpenChange(false);
      setSignature("");
      onApproved?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="size-5 text-primary" /> Aprovação de Proposta
          </DialogTitle>
          <DialogDescription>
            Revise todos os dados e assine para converter em contrato.
          </DialogDescription>
        </DialogHeader>

        {!proposal ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5">
            <Section icon={<User className="size-4" />} title="Cliente">
              <div className="text-sm space-y-1">
                <div className="font-medium">{proposal.client_name || "—"}</div>
                {proposal.client_email && <div className="text-foreground/60">{proposal.client_email}</div>}
              </div>
            </Section>

            <Section icon={<ScrollText className="size-4" />} title="Escopo">
              {(proposal as any).scope_text || (Array.isArray((proposal as any).scope) && (proposal as any).scope.length) ? (
                <ScopeRenderer scope={(proposal as any).scope ?? []} scopeText={(proposal as any).scope_text ?? null} />
              ) : items.length ? (
                <ul className="text-sm space-y-1.5">
                  {items.map((it) => (
                    <li key={it.id} className="flex justify-between gap-3 border-b border-border/40 pb-1">
                      <span>{it.title}</span>
                      <span className="text-foreground/60">
                        {it.quantity}× {formatCurrency(Number(it.unit_price))} {it.recurrence === "monthly" ? "/mês" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-foreground/50">Sem escopo definido.</p>
              )}
            </Section>

            <Section icon={<Coins className="size-4" />} title="Investimento">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <Stat label="Mensal" value={formatCurrency(monthly)} />
                <Stat label="Único" value={formatCurrency(oneTime)} />
                <Stat label="Total" value={formatCurrency(total)} highlight />
              </div>
            </Section>

            <Section icon={<Calendar className="size-4" />} title="Prazo & Cobrança">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Stat label="Tipo de contrato" value={proposal.contract_type === "recurring" ? "Recorrente" : "Pontual"} />
                <Stat label="Validade" value={proposal.valid_until ?? "—"} />
                <Stat label="Início" value={(proposal as any).first_due_date ?? "—"} />
                <Stat label="Dia de cobrança" value={String((proposal as any).billing_day ?? "—")} />
              </div>
            </Section>

            {(proposal as any).contract_content && (
              <Section icon={<FileText className="size-4" />} title="Contrato Jurídico">
                <div
                  className="prose prose-sm max-w-none max-h-60 overflow-y-auto rounded-md border border-border bg-surface/50 p-3 text-foreground/80"
                  dangerouslySetInnerHTML={{ __html: String((proposal as any).contract_content) }}
                />
              </Section>
            )}

            <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-border">
              <div>
                <Label className="text-xs uppercase text-foreground/60">Assinatura KASA</Label>
                <div className="mt-2 rounded-md border border-border bg-surface/40 h-20 flex items-center justify-center">
                  {agency?.agency_signature_url ? (
                    <img src={agency.agency_signature_url} alt="Assinatura agência" className="max-h-16 object-contain" />
                  ) : (
                    <span className="text-xs text-foreground/50 italic">{agency?.name ?? "Agência"}</span>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="client-signature" className="text-xs uppercase text-foreground/60">
                  Assinatura do Cliente *
                </Label>
                <Input
                  id="client-signature"
                  placeholder="Nome completo do responsável"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  className="mt-2"
                />
                <p className="text-[10px] text-foreground/50 mt-1">
                  Ao digitar o nome e clicar em Aprovar, o cliente aceita formalmente esta proposta.
                </p>
              </div>
            </div>

            <Badge variant="outline" className="text-[10px]">
              Status atual: {proposal.status}
            </Badge>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => approveMut.mutate()}
            disabled={approveMut.isPending || !proposal || signature.trim().length < 2}
            className="bg-green-600 text-white hover:bg-green-700 gap-2"
          >
            {approveMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Aprovar Proposta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface/30 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary mb-3">
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-foreground/50">{label}</div>
      <div className={`font-medium ${highlight ? "text-primary text-lg" : ""}`}>{value}</div>
    </div>
  );
}
