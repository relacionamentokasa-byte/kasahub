import { type LucideIcon, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ModuleEmptyProps {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  bullets?: string[];
  phase?: string;
}

export function ModuleEmpty({ icon: Icon, eyebrow, title, description, bullets, phase }: ModuleEmptyProps) {
  return (
    <div className="p-6 lg:p-12 max-w-6xl mx-auto w-full animate-reveal">
      <div className="mb-10 flex items-end justify-between gap-6 flex-wrap">
        <div>
          <span className="text-primary text-[10px] font-mono-kasa capitalize font-medium">
            {eyebrow}
          </span>
          <h1 className="font-display text-4xl lg:text-5xl font-bold tracking-tight mt-2 text-balance">
            {title}
          </h1>
          <p className="text-foreground/60 mt-3 max-w-xl text-balance">{description}</p>
        </div>
        {phase && (
          <span className="text-[10px] font-mono-kasa capitalize text-foreground/40 border border-border rounded-full px-3 py-1">
            {phase}
          </span>
        )}
      </div>

      <div className="relative rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="kasa-pattern absolute inset-0 opacity-40 pointer-events-none" />
        <div className="relative p-10 lg:p-16 flex flex-col items-center text-center">
          <div className="size-16 rounded-2xl bg-primary/10 ring-1 ring-primary/30 flex items-center justify-center mb-6">
            <Icon className="size-7 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-semibold mb-2">Módulo em construção</h2>
          <p className="text-foreground/60 max-w-md mb-8">
            Esta área será ativada quando avançarmos para a fase correspondente do roadmap KASA OS.
          </p>

          {bullets && bullets.length > 0 && (
            <ul className="grid sm:grid-cols-2 gap-3 max-w-2xl w-full mb-10 text-left">
              {bullets.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-3 text-sm text-foreground/80 bg-background/40 border border-border rounded-lg px-4 py-3"
                >
                  <span className="size-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          )}

          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-semibold gap-2 h-10 px-5">
            Ver roadmap completo
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
