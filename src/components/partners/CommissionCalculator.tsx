import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brl } from "@/lib/finance-api";
import { TrendingUp, Calculator } from "lucide-react";

export function CommissionCalculator() {
  const [value, setValue] = useState<number>(0);

  const month1 = value * 0.2;
  const monthNext = value * 0.1;
  const total12Months = month1 + monthNext * 11;

  return (
    <Card className="p-6 bg-surface border-border">
      <div className="flex items-center gap-2 mb-6">
        <Calculator className="size-5 text-primary" />
        <h3 className="font-display text-lg font-bold uppercase tracking-tight">Simulador de Ganhos</h3>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="contract-value">Valor Mensal do Contrato (R$)</Label>
          <Input
            id="contract-value"
            type="number"
            placeholder="Ex: 2000"
            value={value || ""}
            onChange={(e) => setValue(Number(e.target.value))}
            className="bg-background text-lg font-bold"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-background border-primary/20 flex flex-col gap-1 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-5">
               <TrendingUp className="size-12" />
            </div>
            <p className="text-[10px] uppercase font-mono-kasa text-foreground/40 font-bold">No 1º mês você recebe</p>
            <p className="text-2xl font-bold text-primary">{brl(month1)}</p>
            <p className="text-[10px] text-primary/60 font-medium">(20% de comissão)</p>
          </Card>

          <Card className="p-4 bg-background border-border flex flex-col gap-1">
            <p className="text-[10px] uppercase font-mono-kasa text-foreground/40 font-bold">Meses seguintes</p>
            <p className="text-2xl font-bold">{brl(monthNext)}</p>
            <p className="text-[10px] text-foreground/30 font-medium">(10% recorrente)</p>
          </Card>

          <Card className="p-4 bg-background border-border flex flex-col gap-1 border-emerald-500/20">
            <p className="text-[10px] uppercase font-mono-kasa text-foreground/40 font-bold">Total em 12 meses</p>
            <p className="text-2xl font-bold text-emerald-500">{brl(total12Months)}</p>
            <p className="text-[10px] text-emerald-500/60 font-medium">Acumulado projetado</p>
          </Card>
        </div>
      </div>
    </Card>
  );
}
