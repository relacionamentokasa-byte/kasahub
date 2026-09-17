import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchProposal,
  updateProposal,
  formatCurrency,
  type Proposal,
} from "@/lib/crm-api";
import { fetchContractTemplates } from "@/lib/contracts-api";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  FileText,
  DollarSign,
  Calendar,
  Layers,
  Rocket,
  Copy,
  MessageCircle,
  Eye,
  ShieldCheck,
  Check,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { ScopeEditor } from "./ScopeEditor";
import { ClientPicker } from "@/components/clients/ClientPicker";
import { fetchClients } from "@/lib/ops-api";
import { cn } from "@/lib/utils";
import { ProposalApprovalDialog } from "./ProposalApprovalDialog";
import { ProposalSignatureCard } from "./ProposalSignatureCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  calculateInstallmentValues,
  distributeEqually,
} from "@/lib/proposal-negotiation";
import { SheetContentSkeleton } from "@/components/ui/loading-skeletons";

export function ProposalEditorContent({ proposalId }: { proposalId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Proposal>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);

  const { data: proposal, isLoading: isLoadingProposal } = useQuery({
    queryKey: ["proposal", proposalId],
    queryFn: () => fetchProposal(proposalId),
  });

  const { data: contractTemplates = [] } = useQuery({
    queryKey: ["contract-templates"],
    queryFn: fetchContractTemplates,
  });

  const { data: clientsList = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: fetchClients,
  });

  useEffect(() => {
    if (proposal) {
      setForm(proposal);
    }
  }, [proposal]);

  const updateMut = useMutation({
    mutationFn: (patch: Partial<Proposal>) => updateProposal(proposalId, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proposal", proposalId] });
      qc.invalidateQueries({ queryKey: ["propostas"] });
      qc.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Alterações salvas com sucesso");
      setIsDirty(false);
    },
    onError: (e: Error) => toast.error(`Erro ao salvar: ${e.message}`),
  });

  const handleSave = () => {
    const monthly = Number(form.monthly_investment || 0);
    const months = Number(form.recurring_months || 0);
    const setup = Number(form.one_time_investment || 0);
    const total = (monthly * months) + setup;

    if (form.is_special_negotiation) {
      const installments = (form as any).payment_installments_config || [];
      const sum = installments.reduce((acc: number, cur: any) => acc + Number(cur.percent || 0), 0);
      if (Math.abs(sum - 100) > 0.01) {
        toast.error("As porcentagens das parcelas devem totalizar 100%.");
        return;
      }
    }

    const templateId = (form as any).contract_template_id;
    const selectedTemplate = templateId
      ? contractTemplates.find((t) => t.id === templateId)
      : null;
    const contract_content = selectedTemplate ? selectedTemplate.content : null;

    const payload = { ...form, total, contract_content };

    (document.activeElement as HTMLElement)?.blur();
    updateMut.mutate(payload);
  };

  if (isLoadingProposal) {
    return <SheetContentSkeleton />;
  }

  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/proposta/${proposal?.public_token}` : "";

  const copyPublicLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link público copiado!");
  };

  const handleApprove = () => {
    if (isDirty) {
      toast.error("Salve as alterações antes de aprovar.");
      return;
    }
    setIsApprovalDialogOpen(true);
  };

  const openClientWhatsApp = () => {
    const text = `Olá, ${form.client_name || "Cliente"}!%0A%0ASegue a proposta comercial preparada especialmente para sua empresa.%0AVocê pode visualizar todos os detalhes e assinar digitalmente através do link seguro abaixo:%0A%0A${encodeURIComponent(publicUrl)}%0A%0AQualquer dúvida estou à disposição!`;
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const months = Number(form.recurring_months || 0);
  const baseMonthly = Number(form.monthly_investment || 0);
  const setup = Number(form.one_time_investment || 0);
  const adjs: any[] = Array.isArray((form as any).scheduled_adjustments) ? (form as any).scheduled_adjustments : [];
  const sortedAdjs = [...adjs].filter(a => a && Number(a.from_month) > 0).sort((a, b) => Number(a.from_month) - Number(b.from_month));
  let recurringTotal = 0;
  for (let m = 1; m <= (months || 1); m++) {
    const match = [...sortedAdjs].reverse().find(a => Number(a.from_month) <= m);
    recurringTotal += match ? Number(match.value || 0) : baseMonthly;
  }
  const grandTotal = (baseMonthly > 0 ? recurringTotal : 0) + setup;

  return (
    <div className="space-y-5">
      {/* Top Bar: Public Link & Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-card border border-border/60 rounded-lg">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-mono-kasa uppercase text-muted-foreground shrink-0">
            Status:
          </span>
          <Select
            value={form.status || "Rascunho"}
            onValueChange={async (val) => {
              const oldStatus = form.status;
              const newStatus = val;

              if (oldStatus === "Aprovada" && newStatus !== "Aprovada") {
                const confirmed = window.confirm(
                  "Você está revertendo uma proposta que já foi aprovada. " +
                  "Isso removerá automaticamente o Projeto, o Contrato e todos os lançamentos financeiros vinculados. " +
                  "Deseja continuar?"
                );
                if (!confirmed) return;

                const { revertProposalApproval } = await import("@/lib/proposal-approval");
                toast.promise(
                  revertProposalApproval(supabase, proposalId, { reopen: newStatus === "Rascunho" }),
                  {
                    loading: "Revertendo aprovação e limpando vínculos...",
                    success: () => {
                      qc.invalidateQueries({ queryKey: ["proposal", proposalId] });
                      qc.invalidateQueries({ queryKey: ["client-contracts"] });
                      qc.invalidateQueries({ queryKey: ["client-projects"] });
                      qc.invalidateQueries({ queryKey: ["client-transactions"] });
                      qc.invalidateQueries({ queryKey: ["proposals"] });
                      qc.invalidateQueries({ queryKey: ["contracts"] });
                      qc.invalidateQueries({ queryKey: ["projects"] });
                      qc.invalidateQueries({ queryKey: ["transactions"] });
                      setForm({ ...form, status: newStatus });
                      return "Status revertido. Projeto e financeiro vinculados foram removidos.";
                    },
                    error: (err) => `Erro ao reverter: ${err.message}`,
                  }
                );
              } else {
                setForm({ ...form, status: newStatus });
                setIsDirty(true);
              }
            }}
          >
            <SelectTrigger className="h-7 text-xs font-mono-kasa w-36 bg-muted/40 border-border/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Rascunho" className="text-xs font-mono-kasa">Rascunho</SelectItem>
              <SelectItem value="Enviada" className="text-xs font-mono-kasa">Enviada</SelectItem>
              <SelectItem
                value="Aprovada"
                className="text-xs font-mono-kasa text-emerald-600 dark:text-emerald-400"
                disabled={form.status === "Aprovada" || !(form.signature_client || (form as any).client_signature_data)}
              >
                Aprovada {!(form.signature_client || (form as any).client_signature_data) ? "(exige assinatura)" : ""}
              </SelectItem>
              <SelectItem value="Recusada" className="text-xs font-mono-kasa text-destructive">Recusada</SelectItem>
              <SelectItem value="Encerrada" className="text-xs font-mono-kasa">Encerrada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {proposal?.public_token && (
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={copyPublicLink}
              className="h-7 px-2.5 text-xs gap-1.5 font-mono-kasa"
            >
              <Copy className="size-3" />
              <span>Copiar Link</span>
            </Button>
            <Button
              size="sm"
              onClick={openClientWhatsApp}
              className="h-7 px-2.5 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-mono-kasa"
            >
              <MessageCircle className="size-3" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" title="Abrir página pública">
                <Eye className="size-3" />
              </a>
            </Button>
          </div>
        )}
      </div>

      {/* Signature Verification Block */}
      <ProposalSignatureCard
        status={form.status}
        signatureClient={(form as any).signature_client}
        clientSignatureData={(form as any).client_signature_data}
        acceptedName={(form as any).accepted_name}
        acceptedAt={(form as any).accepted_at}
        signedAtClient={(form as any).signed_at_client}
        acceptedIp={(form as any).accepted_ip}
        clientSignedEmail={(form as any).client_signed_email}
        clientEmail={form.client_email}
        clientName={form.client_name}
        externalSignatureUrl={(form as any).external_signature_url}
        externalSignatureFilename={(form as any).external_signature_filename}
      />

      {/* Main Form Sections Grid */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Left Column: Commercial & Billing Details (2 cols) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Identificação e Cliente */}
          <div className="bg-card border border-border/60 rounded-lg p-4 space-y-4">
            <span className="text-[11px] font-mono-kasa uppercase tracking-wider text-muted-foreground block">
              Identificação & Cliente
            </span>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Título da Proposta *</Label>
                <Input
                  value={form.title || ""}
                  onChange={e => { setForm({ ...form, title: e.target.value }); setIsDirty(true); }}
                  placeholder="Ex: Consultoria Mensal de Performance"
                  className="h-8 text-xs bg-muted/20 border-border/60"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Cliente da Base</Label>
                  <ClientPicker
                    value={(form as any).client_id || ""}
                    onChange={(id) => {
                      const c = (clientsList as any[]).find((x) => x.id === id);
                      setForm({
                        ...form,
                        client_id: id || null,
                        client_name: c ? (c.company || c.name || form.client_name) : form.client_name,
                        client_email: c?.email ?? form.client_email,
                      } as any);
                      setIsDirty(true);
                    }}
                    allowClear
                    className="w-full h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Nome Exibido *</Label>
                  <Input
                    value={form.client_name || ""}
                    onChange={(e) => { setForm({ ...form, client_name: e.target.value }); setIsDirty(true); }}
                    placeholder="Nome na proposta"
                    className="h-8 text-xs bg-muted/20 border-border/60"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">E-mail do Cliente</Label>
                  <Input
                    value={form.client_email || ""}
                    onChange={(e) => { setForm({ ...form, client_email: e.target.value }); setIsDirty(true); }}
                    placeholder="contato@cliente.com"
                    className="h-8 text-xs bg-muted/20 border-border/60"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Modelo Jurídico de Contrato</Label>
                  <Select
                    value={(form as any).contract_template_id || "__none__"}
                    onValueChange={(val) => {
                      setForm({ ...form, contract_template_id: val === "__none__" ? null : val } as any);
                      setIsDirty(true);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs bg-muted/20 border-border/60">
                      <SelectValue placeholder="Selecione o modelo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-xs">Nenhum modelo</SelectItem>
                      {contractTemplates.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="text-xs">{t.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Prazos e Vigência */}
          <div className="bg-card border border-border/60 rounded-lg p-4 space-y-4">
            <span className="text-[11px] font-mono-kasa uppercase tracking-wider text-muted-foreground block">
              Prazos & Faturamento
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground font-mono-kasa uppercase">Validade</Label>
                <Input
                  type="date"
                  value={form.valid_until || ""}
                  onChange={e => { setForm({ ...form, valid_until: e.target.value }); setIsDirty(true); }}
                  className="h-8 text-xs font-mono-kasa bg-muted/20 border-border/60"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground font-mono-kasa uppercase">Início Serviço</Label>
                <Input
                  type="date"
                  value={(form as any).service_start_date || ""}
                  onChange={e => { setForm({ ...form, service_start_date: e.target.value } as any); setIsDirty(true); }}
                  className="h-8 text-xs font-mono-kasa bg-muted/20 border-border/60"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground font-mono-kasa uppercase">1º Vencimento</Label>
                <Input
                  type="date"
                  value={form.first_due_date || ""}
                  onChange={e => { setForm({ ...form, first_due_date: e.target.value }); setIsDirty(true); }}
                  className="h-8 text-xs font-mono-kasa bg-muted/20 border-border/60"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground font-mono-kasa uppercase">Dia de Corte</Label>
                <Select
                  value={(form as any).billing_day ? String((form as any).billing_day) : ""}
                  onValueChange={(v) => {
                    setForm({ ...form, billing_day: Number(v) } as any);
                    setIsDirty(true);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs font-mono-kasa bg-muted/20 border-border/60">
                    <SelectValue placeholder="Dia" />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20, 25].map((d) => (
                      <SelectItem key={d} value={String(d)} className="text-xs font-mono-kasa">Dia {d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Investimento & Condições Financeiras */}
          <div className="bg-card border border-border/60 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono-kasa uppercase tracking-wider text-muted-foreground block">
                Investimento & Condições
              </span>
            </div>

            {/* Duração do Contrato em abas compactas */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Duração Contratual</Label>
              <div className="flex items-center gap-1.5">
                {[
                  { value: 3, label: "3 meses" },
                  { value: 6, label: "6 meses" },
                  { value: 12, label: "12 meses" },
                  { value: 0, label: "Job Avulso / Único" },
                ].map((item) => {
                  const isSelected = item.value === 0
                    ? Number(form.recurring_months || 0) === 0 && Number(form.monthly_investment || 0) === 0
                    : Number(form.recurring_months || 0) === item.value;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        if (item.value === 0) {
                          setForm({ ...form, recurring_months: 0, contract_type: "one_time" });
                        } else {
                          setForm({ ...form, recurring_months: item.value, contract_type: "recurring" });
                        }
                        setIsDirty(true);
                      }}
                      className={cn(
                        "px-3 py-1.5 text-xs font-mono-kasa rounded border transition-colors cursor-pointer",
                        isSelected
                          ? "bg-foreground text-background border-foreground font-semibold"
                          : "bg-muted/30 text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted/60"
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Mensalidade (MRR / Fee)</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground font-mono-kasa text-xs">R$</span>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    className="pl-8 h-8 text-xs font-mono-kasa tabular-nums bg-muted/20 border-border/60"
                    value={form.monthly_investment || ""}
                    onChange={e => {
                      setForm({ ...form, monthly_investment: parseFloat(e.target.value) || 0 });
                      setIsDirty(true);
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Setup / Taxa de Implantação</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground font-mono-kasa text-xs">R$</span>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    className="pl-8 h-8 text-xs font-mono-kasa tabular-nums bg-muted/20 border-border/60"
                    value={form.one_time_investment || ""}
                    onChange={e => {
                      setForm({ ...form, one_time_investment: parseFloat(e.target.value) || 0 });
                      setIsDirty(true);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Parcelamento do Setup */}
            {Number(form.one_time_investment || 0) > 0 && (
              <div className="space-y-3 pt-3 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Parcelamento do Setup</Label>
                  <div className="flex items-center gap-1.5">
                    <Checkbox
                      id="special-neg"
                      checked={form.is_special_negotiation || false}
                      onCheckedChange={(checked) => {
                        const isSpecial = checked === true;
                        const installmentsCount = Number(form.installments || 1);
                        let newConfig = (form as any).payment_installments_config;
                        if (!isSpecial) {
                          newConfig = distributeEqually(100, installmentsCount);
                        }
                        setForm({
                          ...form,
                          is_special_negotiation: isSpecial,
                          payment_installments_config: newConfig
                        } as any);
                        setIsDirty(true);
                      }}
                    />
                    <Label htmlFor="special-neg" className="text-[11px] font-mono-kasa text-muted-foreground cursor-pointer">
                      Negociação Especial (%)
                    </Label>
                  </div>
                </div>

                <Select
                  value={String(form.installments || "1")}
                  onValueChange={(val) => {
                    const count = Number(val);
                    const newConfig = distributeEqually(100, count);
                    setForm({
                      ...form,
                      installments: count,
                      payment_installments_config: form.is_special_negotiation ? (form as any).payment_installments_config : newConfig
                    } as any);
                    setIsDirty(true);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs font-mono-kasa bg-muted/20 border-border/60">
                    <SelectValue placeholder="Parcelamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1" className="text-xs font-mono-kasa">À vista</SelectItem>
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                      <SelectItem key={n} value={String(n)} className="text-xs font-mono-kasa">{n}x</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {form.is_special_negotiation && (
                  <div className="space-y-2 p-3 bg-muted/20 rounded border border-border/60">
                    <div className="flex items-center justify-between text-[11px] font-mono-kasa text-muted-foreground">
                      <span>Distribuição percentual</span>
                      {(() => {
                        const installments = (form as any).payment_installments_config || [];
                        const sum = installments.reduce((acc: number, cur: any) => acc + Number(cur.percent || 0), 0);
                        const isError = Math.abs(sum - 100) > 0.01;
                        return (
                          <span className={cn(isError ? "text-destructive font-bold" : "text-foreground font-semibold")}>
                            Total: {sum.toFixed(1)}% {isError && "(!)"}
                          </span>
                        );
                      })()}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {((form as any).payment_installments_config || []).slice(0, Number(form.installments || 1)).map((inst: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <span className="text-[11px] font-mono-kasa text-muted-foreground shrink-0">{idx + 1}ª:</span>
                          <div className="relative flex-1">
                            <Input
                              type="number"
                              value={inst.percent || ""}
                              onChange={(e) => {
                                const list = [...((form as any).payment_installments_config || [])];
                                list[idx] = { ...list[idx], percent: Number(e.target.value) };
                                setForm({ ...form, payment_installments_config: list } as any);
                                setIsDirty(true);
                              }}
                              className="h-7 text-xs font-mono-kasa pr-5 bg-card border-border/60"
                            />
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reajustes Programados */}
            <div className="space-y-3 pt-3 border-t border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-medium block">Reajustes Programados</Label>
                  <span className="text-[11px] text-muted-foreground">Ex: a partir do mês 4 o valor sobe para R$ 700.</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const list = Array.isArray((form as any).scheduled_adjustments) ? [...(form as any).scheduled_adjustments] : [];
                    list.push({ from_month: (list[list.length - 1]?.from_month || 1) + 1, value: Number(form.monthly_investment || 0), note: "" });
                    setForm({ ...form, scheduled_adjustments: list } as any);
                    setIsDirty(true);
                  }}
                  className="h-7 px-2.5 text-xs font-mono-kasa gap-1"
                >
                  <Plus className="size-3" /> Adicionar
                </Button>
              </div>

              {Array.isArray((form as any).scheduled_adjustments) && (form as any).scheduled_adjustments.length > 0 && (
                <div className="space-y-2">
                  {(form as any).scheduled_adjustments.map((adj: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-[80px_1fr_1fr_auto] gap-2 items-center bg-muted/20 border border-border/60 rounded p-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-mono-kasa uppercase text-muted-foreground block">Mês</span>
                        <Input
                          type="number"
                          min={2}
                          max={Number(form.recurring_months || 12)}
                          value={adj.from_month || ""}
                          onChange={e => {
                            const list = [...(form as any).scheduled_adjustments];
                            list[idx] = { ...list[idx], from_month: Number(e.target.value) };
                            setForm({ ...form, scheduled_adjustments: list } as any);
                            setIsDirty(true);
                          }}
                          className="h-7 text-xs font-mono-kasa bg-card border-border/60"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-mono-kasa uppercase text-muted-foreground block">Novo Valor</span>
                        <Input
                          type="number"
                          value={adj.value || ""}
                          onChange={e => {
                            const list = [...(form as any).scheduled_adjustments];
                            list[idx] = { ...list[idx], value: Number(e.target.value) };
                            setForm({ ...form, scheduled_adjustments: list } as any);
                            setIsDirty(true);
                          }}
                          className="h-7 text-xs font-mono-kasa bg-card border-border/60"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-mono-kasa uppercase text-muted-foreground block">Motivo / Nota</span>
                        <Input
                          placeholder="Ex: Pós-setup"
                          value={adj.note || ""}
                          onChange={e => {
                            const list = [...(form as any).scheduled_adjustments];
                            list[idx] = { ...list[idx], note: e.target.value };
                            setForm({ ...form, scheduled_adjustments: list } as any);
                            setIsDirty(true);
                          }}
                          className="h-7 text-xs bg-card border-border/60"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 mt-3 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          const list = (form as any).scheduled_adjustments.filter((_: any, i: number) => i !== idx);
                          setForm({ ...form, scheduled_adjustments: list } as any);
                          setIsDirty(true);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Financial Summary & Internal Notes (1 col) */}
        <div className="space-y-5">
          {/* Executive Contract Summary */}
          <div className="bg-card border border-border/60 rounded-lg p-4 space-y-4">
            <span className="text-[11px] font-mono-kasa uppercase tracking-wider text-muted-foreground block">
              Resumo do Contrato
            </span>

            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground font-mono-kasa uppercase block">
                Valor Total do Pipeline
              </span>
              <div className="font-mono-kasa text-2xl font-bold text-foreground tabular-nums">
                {formatCurrency(grandTotal)}
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-border/60 text-xs font-mono-kasa">
              {baseMonthly > 0 && (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Mensalidade Base:</span>
                    <span className="text-foreground font-medium tabular-nums">{formatCurrency(baseMonthly)}/mês</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Vigência:</span>
                    <span className="text-foreground font-medium tabular-nums">{months} meses</span>
                  </div>
                  {sortedAdjs.map((a, i) => (
                    <div key={i} className="flex justify-between text-[11px] text-muted-foreground pl-2">
                      <span>Mês {a.from_month}+:</span>
                      <span className="text-foreground tabular-nums">{formatCurrency(Number(a.value || 0))}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-muted-foreground pt-1 border-t border-dashed border-border/60">
                    <span>Total Recorrente:</span>
                    <span className="text-foreground font-semibold tabular-nums">{formatCurrency(recurringTotal)}</span>
                  </div>
                </>
              )}

              {setup > 0 && (
                <div className="flex justify-between text-muted-foreground pt-1">
                  <span>Setup / Implantação:</span>
                  <span className="text-foreground font-semibold tabular-nums">{formatCurrency(setup)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Observações Internas */}
          <div className="bg-card border border-border/60 rounded-lg p-4 space-y-3">
            <span className="text-[11px] font-mono-kasa uppercase tracking-wider text-muted-foreground block">
              Observações Internas
            </span>
            <Textarea
              value={form.notes || ""}
              onChange={e => { setForm({ ...form, notes: e.target.value }); setIsDirty(true); }}
              placeholder="Notas de negociação, condições especiais, restrições operacionais..."
              className="min-h-[140px] text-xs bg-muted/20 border-border/60 resize-y"
            />
          </div>
        </div>
      </div>

      {/* Escopo de Trabalho */}
      <div className="bg-card border border-border/60 rounded-lg p-4 space-y-3">
        <span className="text-[11px] font-mono-kasa uppercase tracking-wider text-muted-foreground block">
          Escopo de Trabalho & Proposta Comercial
        </span>
        <div className="border border-border/60 rounded-md overflow-hidden bg-background">
          <ScopeEditor
            value={form.scope || ""}
            onChange={v => { setForm({ ...form, scope: v }); setIsDirty(true); }}
          />
        </div>
      </div>

      {/* Bottom Action Bar (Fixed, minimal) */}
      <div className="sticky bottom-4 z-20 flex items-center justify-between p-3 bg-card/95 backdrop-blur-md border border-border/60 rounded-lg shadow-lg">
        <div className="text-xs font-mono-kasa text-muted-foreground">
          {isDirty ? (
            <span className="text-amber-500 font-medium">● Alterações não salvas</span>
          ) : (
            <span>● Salvo</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleSave}
            disabled={!isDirty || updateMut.isPending}
            variant="outline"
            size="sm"
            className="h-8 px-4 text-xs font-medium gap-1.5"
          >
            {updateMut.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Salvar Alterações
          </Button>

          {form.status !== "Aprovada" ? (
            <Button
              onClick={handleApprove}
              size="sm"
              className="h-8 px-4 text-xs font-medium bg-foreground text-background hover:bg-foreground/90 gap-1.5"
            >
              <Rocket className="size-3.5" />
              Aprovar / Converter
            </Button>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                const confirmed = window.confirm(
                  "Você está cancelando uma proposta que já foi aprovada. " +
                  "Isso removerá automaticamente o Projeto, o Contrato e todos os lançamentos financeiros vinculados. " +
                  "Deseja continuar?"
                );
                if (!confirmed) return;

                const { revertProposalApproval } = await import("@/lib/proposal-approval");
                toast.promise(
                  revertProposalApproval(supabase, proposalId, { reopen: false }),
                  {
                    loading: "Cancelando proposta e removendo dados vinculados...",
                    success: () => {
                      qc.invalidateQueries({ queryKey: ["proposal", proposalId] });
                      qc.invalidateQueries({ queryKey: ["client-contracts"] });
                      qc.invalidateQueries({ queryKey: ["client-projects"] });
                      qc.invalidateQueries({ queryKey: ["client-transactions"] });
                      qc.invalidateQueries({ queryKey: ["proposals"] });
                      qc.invalidateQueries({ queryKey: ["contracts"] });
                      qc.invalidateQueries({ queryKey: ["projects"] });
                      qc.invalidateQueries({ queryKey: ["transactions"] });
                      return "Proposta cancelada. O projeto e o financeiro vinculados foram removidos.";
                    },
                    error: (err) => `Erro ao cancelar: ${err.message}`
                  }
                );
              }}
              className="h-8 px-4 text-xs font-medium gap-1.5"
            >
              <Trash2 className="size-3.5" />
              Cancelar Proposta
            </Button>
          )}
        </div>
      </div>

      <ProposalApprovalDialog
        proposalId={proposalId}
        open={isApprovalDialogOpen}
        onOpenChange={setIsApprovalDialogOpen}
      />
    </div>
  );
}
