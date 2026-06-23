import { useEffect, useState } from "react";
import { CheckCircle2, FolderKanban, Rocket, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = (cid: string) => `kasa:portal-tour-seen:${cid}`;

const STEPS = [
  {
    icon: FolderKanban,
    title: "Bem-vindo ao seu portal",
    body: "Aqui você acompanha tudo que está acontecendo nos seus projetos em tempo real, sem precisar pedir atualizações.",
  },
  {
    icon: CheckCircle2,
    title: "Aprove materiais com 1 clique",
    body: "Quando algo precisar do seu OK, você vai ver destacado e pode aprovar ou pedir ajuste direto por aqui.",
  },
  {
    icon: Rocket,
    title: "Acompanhe seu lançamento",
    body: "O Grid de Lançamento mostra cada produto e a etapa em que está. Tudo claro, do briefing à publicação.",
  },
];

export function PortalTour({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined" || !clientId) return;
    const seen = localStorage.getItem(STORAGE_KEY(clientId));
    if (!seen) {
      // Slight delay so portal renders first
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, [clientId]);

  const finish = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY(clientId), new Date().toISOString());
    }
    setOpen(false);
    setStep(0);
  };

  if (!open) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-surface border border-border rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative animate-in zoom-in-95 duration-300">
        <button
          onClick={finish}
          aria-label="Fechar"
          className="absolute top-4 right-4 size-8 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center transition"
        >
          <X className="size-4" />
        </button>

        <div className="size-14 rounded-2xl bg-primary/15 flex items-center justify-center mb-4">
          <Icon className="size-7 text-primary" />
        </div>

        <h2 className="font-display text-2xl font-bold mb-2">{current.title}</h2>
        <p className="text-foreground/60 text-sm leading-relaxed">{current.body}</p>

        <div className="flex items-center justify-between mt-8">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-primary" : "w-1.5 bg-muted"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {!isLast && (
              <Button variant="ghost" size="sm" onClick={finish} className="text-foreground/50">
                Pular
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => (isLast ? finish() : setStep(step + 1))}
              className="rounded-full px-5"
            >
              {isLast ? "Começar" : "Próximo"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
