import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme";

export function PreferencesTab() {
  const { theme, setTheme } = useTheme();
  const options: { value: "light" | "dark"; label: string; desc: string; icon: typeof Sun }[] = [
    { value: "light", label: "Claro", desc: "Fundo claro, leve e produtivo.", icon: Sun },
    { value: "dark", label: "Escuro", desc: "Padrão Kasa, sofisticado e contrastado.", icon: Moon },
  ];
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="space-y-4">
        <div>
          <p className="font-display text-lg font-semibold">Tema da interface</p>
          <p className="text-xs text-foreground/50">
            Sua preferência é salva localmente e aplicada apenas para você. A barra lateral mantém a identidade Kasa em ambos os temas.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {options.map((opt) => {
            const active = theme === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={`text-left rounded-lg border p-4 transition-all flex items-start gap-3 ${
                  active
                    ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                    : "border-border bg-background/40 hover:border-foreground/20"
                }`}
              >
                <div className={`size-9 rounded-md flex items-center justify-center shrink-0 ${active ? "bg-primary/20 text-primary" : "bg-muted text-foreground/60"}`}>
                  <Icon className="size-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{opt.label}</p>
                  <p className="text-xs text-foreground/50 mt-0.5">{opt.desc}</p>
                </div>
                <span className={`size-4 rounded-full border-2 mt-1 ${active ? "border-primary bg-primary" : "border-foreground/30"}`} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
