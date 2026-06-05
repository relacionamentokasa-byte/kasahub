import { useEffect, useState } from "react";
import { Loader2, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { fetchAgencySettings, updateAgencySettings } from "@/lib/settings-api";

const FLAG_KEY = "kasa.onboarding.done";

export function OnboardingWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [agencyId, setAgencyId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(FLAG_KEY) === "1") return;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;
      setUserId(user.id);
      const meta = (user.user_metadata ?? {}) as { full_name?: string; display_name?: string };
      setFullName(meta.full_name ?? meta.display_name ?? "");

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      const settings = await fetchAgencySettings();
      if (settings) {
        setAgencyId(settings.id);
        setAgencyName(settings.name ?? "");
        setLogoUrl(settings.logo_url ?? "");
      }

      const profileMissing = !prof?.full_name;
      const agencyMissing = !settings?.logo_url && (!settings?.name || settings.name === "Kasa Marketing");
      if (profileMissing || agencyMissing) setOpen(true);
      else localStorage.setItem(FLAG_KEY, "1");
    })();
  }, []);

  const dismiss = () => {
    localStorage.setItem(FLAG_KEY, "1");
    setOpen(false);
  };

  const saveProfile = async () => {
    if (!userId) return;
    if (!fullName.trim()) {
      toast.error("Diga seu nome para continuar.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, display_name: fullName })
        .eq("id", userId);
      if (error) throw error;
      setStep(2);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const saveAgency = async () => {
    if (!agencyId) return dismiss();
    if (!agencyName.trim()) {
      toast.error("Informe o nome da agência.");
      return;
    }
    setLoading(true);
    try {
      await updateAgencySettings(agencyId, {
        name: agencyName,
        logo_url: logoUrl || null,
      });
      toast.success("Tudo pronto. Bem-vindo ao KASA OS.");
      dismiss();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && dismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Sparkles className="size-4" />
            <span className="text-[10px] font-mono-kasa uppercase tracking-[0.25em] font-semibold">
              Bem-vindo · Passo {step} de 2
            </span>
          </div>
          <DialogTitle className="font-display text-2xl">
            {step === 1 ? "Como podemos te chamar?" : "Sua agência"}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Esse é o nome que aparece para sua equipe e seus clientes."
              : "Defina o nome e o logo que personalizam o sistema e o portal do cliente."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-foreground/60">
                Nome completo
              </Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ex.: Lucas Almeida"
                autoFocus
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-foreground/60">
                Nome da agência
              </Label>
              <Input
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                placeholder="Kasa Marketing Consultoria"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-foreground/60">
                Logo (URL) — opcional
              </Label>
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
              />
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="prévia logo"
                  className="mt-2 max-h-16 rounded border border-border bg-surface p-2"
                  onError={(ev) => ((ev.target as HTMLImageElement).style.display = "none")}
                />
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between gap-2 pt-2">
          <Button variant="ghost" onClick={dismiss} disabled={loading}>
            Pular
          </Button>
          <div className="flex gap-2">
            {step === 2 && (
              <Button variant="outline" onClick={() => setStep(1)} disabled={loading}>
                Voltar
              </Button>
            )}
            <Button
              onClick={step === 1 ? saveProfile : saveAgency}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  {step === 1 ? "Continuar" : "Concluir"}
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
