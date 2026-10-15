import { useMemo } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  calculatePricing,
  createPricingSnapshot,
  type PricingInput,
  type PricingParameters,
  type PricingResult,
  type PricingServiceType,
  type PricingSize,
} from "@/lib/pricing/pricing-engine";

export type PricingLine = PricingInput & {
  id: string;
  title: string;
  recurrence: "monthly" | "one_time";
};

interface Props {
  parameters: PricingParameters;
  lines: PricingLine[];
  onChange: (lines: PricingLine[]) => void;
  readOnly?: boolean;
}

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const SERVICE_LABELS: Record<PricingServiceType, string> = {
  team: "Só equipe",
  third_party: "Só terceiro",
  mixed: "Equipe + terceiro",
  monthly: "Cliente mensal",
};

function emptyLine(): PricingLine {
  return {
    id: crypto.randomUUID(),
    title: "Novo serviço",
    serviceType: "team",
    size: "M",
    days: 1,
    thirdPartyCost: 0,
    clientCount: 1,
    urgent: false,
    salePrice: 0,
    recurrence: "one_time",
  };
}

function getResult(line: PricingLine, parameters: PricingParameters): PricingResult {
  return calculatePricing(line, parameters);
}

export function ProposalPricingSimulator({ parameters, lines, onChange, readOnly = false }: Props) {
  const results = useMemo(() => lines.map((line) => getResult(line, parameters)), [lines, parameters]);
  const totals = useMemo(() => ({
    floor: results.reduce((sum, result) => sum + result.floorPrice, 0),
    sale: results.reduce((sum, result) => sum + result.salePrice, 0),
    surplus: results.reduce((sum, result) => sum + result.surplus, 0),
  }), [results]);
  const hasBelowFloor = results.some((result) => result.isBelowFloor);

  const patchLine = (id: string, patch: Partial<PricingLine>) => {
    onChange(lines.map((line) => line.id === id ? { ...line, ...patch } : line));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label className="text-xs font-semibold">Simulador de preço</Label>
          <p className="text-[11px] text-muted-foreground mt-0.5">O piso é calculado pelos parâmetros econômicos atuais.</p>
        </div>
        {!readOnly && (
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => onChange([...lines, emptyLine()])}>
            <Plus className="size-3.5" /> Adicionar serviço
          </Button>
        )}
      </div>

      {lines.length === 0 && (
        <div className="border border-dashed border-border rounded-lg p-6 text-center text-xs text-muted-foreground">
          Adicione o primeiro serviço para calcular o piso da proposta.
        </div>
      )}

      {lines.map((line, index) => {
        const result = results[index];
        return (
          <div key={line.id} className={cn("rounded-lg border p-3 space-y-3", result.isBelowFloor ? "border-destructive/50 bg-destructive/5" : "border-border/60 bg-muted/10")}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Serviço {index + 1}</Label>
                <Input disabled={readOnly} value={line.title} onChange={(event) => patchLine(line.id, { title: event.target.value })} className="h-8 text-xs bg-card" />
              </div>
              {!readOnly && (
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onChange(lines.filter((item) => item.id !== line.id))}>
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Tipo</Label>
                <Select disabled={readOnly} value={line.serviceType} onValueChange={(value: PricingServiceType) => patchLine(line.id, { serviceType: value })}>
                  <SelectTrigger className="h-8 text-xs bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(SERVICE_LABELS).map(([value, label]) => <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {(line.serviceType === "team" || line.serviceType === "mixed") && (
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Tamanho / dias</Label>
                  {line.serviceType === "team" ? (
                    <Select disabled={readOnly} value={line.size || "M"} onValueChange={(value: PricingSize) => patchLine(line.id, { size: value, days: parameters.sizes[value].days })}>
                      <SelectTrigger className="h-8 text-xs bg-card"><SelectValue /></SelectTrigger>
                      <SelectContent>{(["P", "M", "G", "GG"] as PricingSize[]).map((size) => <SelectItem key={size} value={size} className="text-xs">{size} · {parameters.sizes[size].days} dias</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <Input disabled={readOnly} type="number" min="0" step="0.5" value={line.days ?? ""} onChange={(event) => patchLine(line.id, { days: Number(event.target.value) || 0 })} className="h-8 text-xs bg-card" />
                  )}
                </div>
              )}

              {(line.serviceType === "third_party" || line.serviceType === "mixed") && (
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Custo do terceiro</Label>
                  <Input disabled={readOnly} type="number" min="0" step="0.01" value={line.thirdPartyCost || ""} onChange={(event) => patchLine(line.id, { thirdPartyCost: Number(event.target.value) || 0 })} className="h-8 text-xs bg-card" />
                </div>
              )}

              {line.serviceType === "monthly" && (
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Número de clientes</Label>
                  <Input disabled={readOnly} type="number" min="1" step="1" value={line.clientCount || ""} onChange={(event) => patchLine(line.id, { clientCount: Number(event.target.value) || 0, recurrence: "monthly" })} className="h-8 text-xs bg-card" />
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Preço de venda</Label>
                <Input disabled={readOnly} type="number" min="0" step="0.01" value={line.salePrice || ""} onChange={(event) => patchLine(line.id, { salePrice: Number(event.target.value) || 0 })} className={cn("h-8 text-xs bg-card", result.isBelowFloor && "border-destructive")} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <button type="button" disabled={readOnly} onClick={() => patchLine(line.id, { urgent: !line.urgent })} className={cn("rounded border px-2 py-1", line.urgent ? "border-amber-400 bg-amber-50 text-amber-800" : "border-border text-muted-foreground")}>Urgência até 48h {line.urgent ? "(+30%)" : ""}</button>
              <span className="text-muted-foreground">Piso: <strong className="text-foreground">{money(result.floorPrice)}</strong></span>
              <span className={cn(result.isBelowFloor ? "text-destructive" : "text-emerald-700")}>Sobra: <strong>{money(result.surplus)} ({result.surplusPercent.toLocaleString("pt-BR")}%)</strong></span>
            </div>

            {result.requiresProjectQuote && <p className="text-[11px] text-amber-700 flex items-center gap-1"><AlertTriangle className="size-3.5" /> Mais de {parameters.maxFreelanceDays} dias: tratar como projeto com orçamento próprio.</p>}
            {result.isBelowFloor && <p className="text-[11px] text-destructive flex items-center gap-1"><AlertTriangle className="size-3.5" /> Preço abaixo do piso operacional.</p>}
          </div>
        );
      })}

      {lines.length > 0 && (
        <div className={cn("rounded-lg border p-3 grid grid-cols-3 gap-3 text-xs", hasBelowFloor ? "border-destructive/40 bg-destructive/5" : "border-border/60 bg-card")}>
          <div><span className="block text-muted-foreground">Piso total</span><strong>{money(totals.floor)}</strong></div>
          <div><span className="block text-muted-foreground">Venda total</span><strong>{money(totals.sale)}</strong></div>
          <div><span className="block text-muted-foreground">Sobra total</span><strong className={totals.surplus < 0 ? "text-destructive" : "text-emerald-700"}>{money(totals.surplus)}</strong></div>
        </div>
      )}
    </div>
  );
}

export function snapshotForLine(line: PricingLine, parameters: PricingParameters) {
  return createPricingSnapshot(line, parameters);
}
