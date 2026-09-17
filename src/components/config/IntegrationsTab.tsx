import type { AgencySettings } from "@/lib/settings-api";
import { GoogleCalendarIntegration } from "./GoogleCalendarIntegration";
import { MessageSquare, Mail, Plug } from "lucide-react";

export function IntegrationsTab({ form: _form }: { form: Partial<AgencySettings> }) {
  return (
    <div className="space-y-6">
      <GoogleCalendarIntegration />

      <div className="rounded-xl border border-border/80 bg-card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Plug className="size-4 text-primary" /> Outras Conexões
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Módulos de comunicação automatizada com clientes e notificações operacionais.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-3 border border-border/80 rounded-xl p-3.5 bg-muted/20 opacity-80">
            <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <MessageSquare className="size-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs text-foreground">WhatsApp Business</p>
              <p className="text-xs text-muted-foreground mt-0.5">Aprovações de criativos e avisos em tempo real.</p>
            </div>
            <span className="text-[10px] font-mono-kasa uppercase px-2 py-0.5 rounded-md bg-muted border border-border/60 text-muted-foreground shrink-0">
              Em breve
            </span>
          </div>

          <div className="flex items-center gap-3 border border-border/80 rounded-xl p-3.5 bg-muted/20 opacity-80">
            <div className="size-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Mail className="size-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs text-foreground">E-mail Transacional</p>
              <p className="text-xs text-muted-foreground mt-0.5">Disparos de faturamento e relatórios (Resend).</p>
            </div>
            <span className="text-[10px] font-mono-kasa uppercase px-2 py-0.5 rounded-md bg-muted border border-border/60 text-muted-foreground shrink-0">
              Em breve
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
