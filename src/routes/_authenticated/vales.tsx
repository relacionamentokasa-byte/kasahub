import { createFileRoute, ErrorComponent } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Loader2, Wallet, Ban } from "lucide-react";
import {
  fetchCompanyPartners,
  fetchPartnerAdvances,
  createPartnerAdvance,
  cancelPartnerAdvance,
  type PartnerAdvance,
} from "@/lib/partners-finance-api";
import { fetchContasBancarias } from "@/lib/contas-bancarias-api";
import { RawTableRowsSkeleton } from "@/components/ui/loading-skeletons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/vales")({
  component: ValesPage,
  errorComponent: ({ error }) => <ErrorComponent error={error} />,
  notFoundComponent: () => <div className="p-6">Página não encontrada</div>,
});

const STATUS_LABEL: Record<PartnerAdvance["status"], string> = {
  open: "Em aberto",
  partially_settled: "Parcialmente quitado",
  settled: "Quitado",
  cancelled: "Cancelado",
};

const STATUS_VARIANT: Record<PartnerAdvance["status"], "default" | "secondary" | "destructive" | "outline"> = {
  open: "default",
  partially_settled: "secondary",
  settled: "outline",
  cancelled: "destructive",
};

function ValesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: advances = [], isLoading } = useQuery({
    queryKey: ["partner-advances"],
    queryFn: fetchPartnerAdvances,
  });

  const { data: partners = [] } = useQuery({
    queryKey: ["company-partners"],
    queryFn: fetchCompanyPartners,
  });

  const { data: contas = [] } = useQuery({
    queryKey: ["contas_bancarias"],
    queryFn: fetchContasBancarias,
  });

  const cancelMut = useMutation({
    mutationFn: cancelPartnerAdvance,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-advances"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Vale cancelado");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao cancelar"),
  });

  // Saldo por sócio (vales em aberto - já quitado)
  const balanceByPartner = partners.map((p) => {
    const open = advances
      .filter((a) => a.partner_id === p.id && a.status !== "cancelled" && a.status !== "settled")
      .reduce((sum, a) => sum + Number(a.amount) - Number(a.settled_amount), 0);
    return { partner: p, balance: open };
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Wallet className="size-6" /> Vales de Sócios
          </h1>
          <p className="text-sm text-muted-foreground">
            Adiantamentos pagos aos sócios — descontados da próxima distribuição.
          </p>
        </div>
        <NewAdvanceDialog
          open={open}
          onOpenChange={setOpen}
          partners={partners}
          contas={contas}
        />
      </div>

      {/* Saldo por sócio */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {balanceByPartner.map(({ partner, balance }) => (
          <div key={partner.id} className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">{partner.full_name}</p>
            <p className="text-2xl font-semibold mt-1">
              {balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {partner.distribution_type === "pro_labore_only"
                ? "Apenas pró-labore"
                : `${partner.share_percentage}% distribuição`}
            </p>
          </div>
        ))}
      </div>

      {/* Lista */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Sócio</th>
              <th className="text-left px-4 py-3 font-medium">Data</th>
              <th className="text-left px-4 py-3 font-medium">Descrição</th>
              <th className="text-right px-4 py-3 font-medium">Valor</th>
              <th className="text-right px-4 py-3 font-medium">Quitado</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <RawTableRowsSkeleton rows={5} columns={7} />
            ) : advances.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">
                Nenhum vale registrado.
              </td></tr>
            ) : (
              advances.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="px-4 py-3">{a.company_partners?.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {format(new Date(a.advance_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3">{a.description || "—"}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {Number(a.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {Number(a.settled_amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {a.status === "open" || a.status === "partially_settled" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("Cancelar este vale? (a despesa no caixa NÃO é estornada automaticamente)"))
                            cancelMut.mutate(a.id);
                        }}
                      >
                        <Ban className="size-3.5" />
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewAdvanceDialog({
  open,
  onOpenChange,
  partners,
  contas,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  partners: { id: string; full_name: string }[];
  contas: { id: string; nome: string }[];
}) {
  const qc = useQueryClient();
  const [partnerId, setPartnerId] = useState("");
  const [amount, setAmount] = useState("");
  const [advanceDate, setAdvanceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [contaId, setContaId] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  const mut = useMutation({
    mutationFn: createPartnerAdvance,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-advances"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["contas_bancarias"] });
      qc.invalidateQueries({ queryKey: ["finance-stats"] });
      toast.success("Vale registrado e debitado do caixa.");
      onOpenChange(false);
      setPartnerId(""); setAmount(""); setContaId(""); setDescription(""); setNotes("");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao registrar vale"),
  });

  const submit = () => {
    if (!partnerId || !amount || !contaId) {
      toast.error("Preencha sócio, valor e conta bancária.");
      return;
    }
    mut.mutate({
      partner_id: partnerId,
      amount: Number(amount),
      advance_date: advanceDate,
      conta_id: contaId,
      description: description || null,
      notes: notes || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button><Plus className="size-4 mr-2" /> Novo Vale</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Novo Vale de Sócio</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Sócio *</Label>
            <Select value={partnerId} onValueChange={setPartnerId}>
              <SelectTrigger><SelectValue placeholder="Selecione o sócio" /></SelectTrigger>
              <SelectContent>
                {partners.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div>
              <Label>Data *</Label>
              <Input
                type="date"
                value={advanceDate}
                onChange={(e) => setAdvanceDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Conta bancária *</Label>
            <Select value={contaId} onValueChange={setContaId}>
              <SelectTrigger><SelectValue placeholder="Selecione a conta de saída" /></SelectTrigger>
              <SelectContent>
                {contas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: adiantamento de junho"
            />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Ao salvar: o valor é debitado da conta bancária como despesa "Vale Sócio" e fica em aberto
            para ser descontado da próxima distribuição.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mut.isPending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
            Registrar Vale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
