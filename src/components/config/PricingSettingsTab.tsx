import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, Loader2, RotateCcw, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  DEFAULT_PRICING_PARAMETERS,
  type PricingParameters,
  type PricingSize,
} from "@/lib/pricing/pricing-engine";
import {
  fetchPricingParameters,
  savePricingParameters,
  validatePricingParameters,
} from "@/lib/pricing/pricing-api";

const numberValue = (value: string) => Number(value) || 0;
const sizes: PricingSize[] = ["P", "M", "G", "GG"];

export function PricingSettingsTab({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const { data: loaded, isLoading } = useQuery({
    queryKey: ["pricing-parameters"],
    queryFn: fetchPricingParameters,
  });
  const [form, setForm] = useState<PricingParameters>(DEFAULT_PRICING_PARAMETERS);

  useEffect(() => {
    if (loaded) setForm(loaded);
  }, [loaded]);

  const mutation = useMutation({
    mutationFn: async () => {
      const errors = validatePricingParameters(form);
      if (errors.length) throw new Error(errors.join(" "));
      return savePricingParameters(form);
    },
    onSuccess: (saved) => {
      setForm(saved);
      qc.setQueryData(["pricing-parameters"], saved);
      toast.success("Parâmetros de precificação salvos.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const set = <K extends keyof PricingParameters>(key: K, value: PricingParameters[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando parâmetros...</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border/60 bg-card p-4 flex items-start gap-3">
        <Calculator className="size-5 text-primary mt-0.5" />
        <div>
          <p className="text-sm font-semibold">Parâmetros de Precificação</p>
          <p className="text-xs text-muted-foreground mt-1">
            Estes valores alimentam o simulador das propostas. Alterações afetam apenas novos cálculos; cada item salvo mantém seu snapshot histórico.
          </p>
        </div>
      </div>

      {!canEdit && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 flex items-center gap-2">
          <ShieldCheck className="size-4" /> Somente Administradores e CEOs podem alterar estes parâmetros.
        </div>
      )}

      <section className="rounded-lg border border-border/60 bg-card p-4 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Economia da operação</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {([
            ["baseRevenue", "Faturamento base (R$)"],
            ["totalProLabore", "Pró-labore total (R$)"],
            ["structureCost", "Estrutura (R$)"],
            ["profitPercent", "Lucro (%)"],
            ["billableTimePercent", "Tempo cobrável (%)"],
            ["billableDays", "Dias vendáveis"],
            ["dayRate", "Valor do dia (R$)"],
            ["urgencyPercent", "Urgência até 48h (%)"],
            ["maxFreelanceDays", "Limite avulso (dias)"],
          ] as const).map(([key, label]) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <Input
                disabled={!canEdit}
                type="number"
                min="0"
                step="0.01"
                value={form[key] as number}
                onChange={(event) => set(key, numberValue(event.target.value) as PricingParameters[typeof key])}
                className="h-8 text-xs"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border/60 bg-card p-4 space-y-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tamanhos da equipe</h3>
          <p className="text-[11px] text-muted-foreground mt-1">Os valores P, M, G e GG são o piso padrão de serviços da equipe.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {sizes.map((size) => (
            <div key={size} className="rounded-md border border-border/60 p-3 space-y-2">
              <span className="font-semibold text-sm">{size}</span>
              <div className="space-y-1">
                <Label className="text-[11px]">Dias</Label>
                <Input disabled={!canEdit} type="number" min="0" step="0.5" value={form.sizes[size].days} onChange={(event) => set("sizes", { ...form.sizes, [size]: { ...form.sizes[size], days: numberValue(event.target.value) } })} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Preço padrão (R$)</Label>
                <Input disabled={!canEdit} type="number" min="0" step="0.01" value={form.sizes[size].defaultPrice} onChange={(event) => set("sizes", { ...form.sizes, [size]: { ...form.sizes[size], defaultPrice: numberValue(event.target.value) } })} className="h-8 text-xs" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border/60 bg-card p-4 space-y-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Multiplicadores</h3>
          <p className="text-[11px] text-muted-foreground mt-1">Deixe em branco ou zero para usar o multiplicador derivado da estrutura econômica.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Terceiro integral (opcional)</Label>
            <Input disabled={!canEdit} type="number" min="0" step="0.01" value={form.thirdPartyMultiplier ?? ""} onChange={(event) => set("thirdPartyMultiplier", event.target.value ? numberValue(event.target.value) : null)} className="h-8 text-xs" placeholder="Derivado" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Terceiro misto</Label>
            <Input disabled={!canEdit} type="number" min="0" step="0.01" value={form.mixedThirdPartyMultiplier ?? ""} onChange={(event) => set("mixedThirdPartyMultiplier", event.target.value ? numberValue(event.target.value) : null)} className="h-8 text-xs" />
          </div>
        </div>
      </section>

      {canEdit && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setForm(DEFAULT_PRICING_PARAMETERS)} className="gap-1.5">
            <RotateCcw className="size-3.5" /> Restaurar padrão
          </Button>
          <Button type="button" size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gap-1.5">
            {mutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Salvar parâmetros
          </Button>
        </div>
      )}
    </div>
  );
}
