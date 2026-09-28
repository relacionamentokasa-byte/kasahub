import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileSignature,
  Plus,
  TrendingUp,
  History,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileDown,
  Sparkles,
} from "lucide-react";
import { brl } from "@/lib/utils-format";
import { fetchContractAddendums } from "@/lib/contract-addendums-api";
import { ADDENDUM_TYPE_LABELS } from "@/types/contract-addendums";
import { ContractAddendumDialog } from "./ContractAddendumsList";
import { MonthlyDeliverablesDialog } from "./MonthlyDeliverablesDialog";

interface Props {
  contract: {
    id: string;
    title: string;
    monthly_value: number | null;
    start_date: string;
    client_id: string;
    status: string | null;
    service_ids?: string[] | null;
  };
  clientId: string;
  clientName?: string;
  clientCompany?: string | null;
  clientLogoUrl?: string | null;
}

export function ContractAddendumsSection({ contract, clientId, clientName = "Cliente", clientCompany, clientLogoUrl }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deliverablesDialogOpen, setDeliverablesDialogOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const { data: addendums = [] } = useQuery({
    queryKey: ["client-addendums", contract.id],
    queryFn: () => fetchContractAddendums(contract.id),
  });

  return (
    <div className="pt-3 mt-3 border-t border-border/50 space-y-2.5">
      {/* Botão de Fechamento Mensal das Entregas */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setDeliverablesDialogOpen(true)}
        className="w-full h-8 text-[11px] font-mono-kasa tracking-tight gap-1.5 border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 hover:text-amber-800"
      >
        <Sparkles className="size-3.5 text-amber-500" /> Relatório Mensal de Entregas (PDF)
      </Button>

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5">
          <History className="size-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold text-foreground">Termos Aditivos</span>
          {addendums.length > 0 && (
            <Badge variant="secondary" className="text-[9px] font-mono-kasa px-1.5 h-4">
              {addendums.length}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {addendums.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
            >
              {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="h-6 px-2 text-[10px] font-mono-kasa gap-1 border-primary/40 text-primary hover:bg-primary/10"
          >
            <Plus className="size-3" /> Aditivo
          </Button>
        </div>
      </div>

      {/* Lista detalhada quando expandida */}
      {expanded && addendums.length > 0 && (
        <div className="space-y-2 pt-1">
          {addendums.map((addendum) => {
            const typeInfo = ADDENDUM_TYPE_LABELS[addendum.type] || ADDENDUM_TYPE_LABELS.mixed;
            const delta = addendum.new_monthly_value - addendum.previous_monthly_value;

            return (
              <div
                key={addendum.id}
                className="p-2.5 rounded-md bg-muted/20 border border-border/60 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground text-[11px]">
                    {addendum.addendum_number}º Aditivo: {addendum.title}
                  </span>
                  <Badge variant="outline" className="text-[9px] font-mono-kasa">
                    {typeInfo.label}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono-kasa">
                  <span>Vigência: {new Date(addendum.effective_date).toLocaleDateString()}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="line-through">{brl(addendum.previous_monthly_value)}</span>
                    <span>→</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {brl(addendum.new_monthly_value)}
                    </span>
                  </div>
                </div>

                {addendum.notes && (
                  <p className="text-[10px] text-muted-foreground/80 italic line-clamp-2">
                    {addendum.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Emissão de Aditivo */}
      <ContractAddendumDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contract={contract}
        clientId={clientId}
      />

      {/* Modal de Relatório Mensal de Entregas (PDF) */}
      <MonthlyDeliverablesDialog
        open={deliverablesDialogOpen}
        onOpenChange={setDeliverablesDialogOpen}
        clientId={clientId}
        clientName={clientName}
        clientCompany={clientCompany}
        clientLogoUrl={clientLogoUrl}
        contract={contract}
      />
    </div>
  );
}
