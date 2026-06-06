import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileSignature, 
  Calendar, 
  DollarSign, 
  Tag, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MoreHorizontal,
  XCircle,
  Trash2
} from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { terminateContract } from "@/lib/finance-api";
import { toast } from "sonner";
import { TerminateRecurrenceDialog } from "@/components/finance/TerminateRecurrenceDialog";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  try {
    return format(new Date(d), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return d;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "active":
      return <span className="bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1"><CheckCircle2 className="size-3" /> Ativo</span>;
    case "paused":
      return <span className="bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1"><Clock className="size-3" /> Pausado</span>;
    case "finished":
      return <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1"><CheckCircle2 className="size-3" /> Encerrado</span>;
    case "cancelled":
      return <span className="bg-rose-500/15 text-rose-400 px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1"><AlertCircle className="size-3" /> Cancelado</span>;
    default:
      return <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-[10px] font-medium">{status}</span>;
  }
};

const getTypeLabel = (type: string | null) => {
  switch (type) {
    case "recurring": return "Recorrente";
    case "one_time": return "Job Avulso";
    case "special_project": return "Projeto Especial";
    case "consultancy": return "Consultoria";
    default: return type || "Contrato";
  }
};

export function ClientContracts({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const [terminatingContractId, setTerminatingContractId] = useState<string | null>(null);

  const { data: contracts = [], isLoading } = useQuery({

    queryKey: ["contracts", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="text-sm text-foreground/40 p-10">Carregando contratos...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileSignature className="size-5 text-primary" /> Contratos do Cliente
        </h3>
      </div>

      {contracts.length === 0 ? (
        <div className="bg-surface border border-dashed border-border rounded-2xl p-10 text-center">
          <FileSignature className="size-10 text-foreground/20 mx-auto mb-3" />
          <p className="text-foreground/50">Nenhum contrato encontrado para este cliente.</p>
          <p className="text-xs text-foreground/30 mt-1">Contratos são gerados automaticamente ao aprovar uma proposta.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contracts.map((contract) => (
            <div 
              key={contract.id} 
              className="bg-surface border border-border rounded-2xl p-5 hover:border-primary/30 transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-[10px] uppercase text-foreground/40 mb-1 flex items-center gap-1">
                    <Tag className="size-3" /> {getTypeLabel(contract.type)}
                  </div>
                  <h4 className="font-display font-bold text-lg group-hover:text-primary transition-colors">
                    {contract.title}
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(contract.status)}
                  {contract.status === "active" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8 rounded-full">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Gestão de Contrato</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-rose-400"
                          onClick={() => setTerminatingContractId(contract.id)}
                        >
                          <XCircle className="size-4 mr-2" /> Encerrar Contrato
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="space-y-1">
                  <div className="text-[10px] uppercase text-foreground/40">Valor</div>
                  <div className="font-semibold text-sm flex items-center gap-1.5">
                    <DollarSign className="size-3.5 text-emerald-400" />
                    {Number(contract.monthly_value || 0) > 0 ? (
                      <span>{BRL(Number(contract.monthly_value))} <span className="text-[10px] text-foreground/40 font-normal">/mês</span></span>
                    ) : (
                      <span>{BRL(Number(contract.total_value || 0))}</span>
                    )}
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <div className="text-[10px] uppercase text-foreground/40">Vigência</div>
                  <div className="text-sm flex items-center justify-end gap-1.5 font-medium">
                    <Calendar className="size-3.5 text-primary" />
                    {fmtDate(contract.start_date)}
                    {contract.end_date && ` — ${fmtDate(contract.end_date)}`}
                  </div>
                </div>
              </div>

              {contract.billing_day && (
                <div className="mt-4 pt-4 border-t border-border/50 text-xs text-foreground/50 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-3.5" /> Dia de faturamento: <strong>{contract.billing_day}</strong>
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {terminatingContractId && (
        <TerminateContractWorkflow 
          contractId={terminatingContractId} 
          onClose={() => setTerminatingContractId(null)} 
        />
      )}
    </div>
  );
}

function TerminateContractWorkflow({ contractId, onClose }: { contractId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (mode: "keep" | "cancel" | "delete") => terminateContract(contractId, mode),
    onSuccess: (result) => {
      toast.success("Contrato encerrado com sucesso.");
      if (result.count > 0) {
        toast.info(`${result.count} cobranças futuras foram tratadas.`);
      }
      qc.invalidateQueries({ queryKey: ["contracts"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <TerminateRecurrenceDialog 
      recurrenceId={contractId} // We pass contractId as recurrenceId because we want to reuse the UI
      onClose={onClose}
      title="Encerrar Contrato"
      description="Ao encerrar o contrato, o que deseja fazer com as cobranças recorrentes vinculadas a ele?"
    />
  );
}

