import type { AgencySettings } from "@/lib/settings-api";
import { GoogleCalendarIntegration } from "./GoogleCalendarIntegration";
import { MessageSquare, Mail } from "lucide-react";

export function IntegrationsTab({ form: _form }: { form: Partial<AgencySettings> }) {
  return (
    <div className="space-y-6">
      <GoogleCalendarIntegration />

      <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <div>
          <h3 className="font-display text-lg font-semibold">Outras integrações</h3>
          <p className="text-xs text-foreground/50 mt-1">Conexões em desenvolvimento — disponíveis em breve.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-3 border border-border rounded-lg p-4 bg-background/40 opacity-70">
            <div className="size-10 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <MessageSquare className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">WhatsApp Business</p>
              <p className="text-xs text-foreground/50">Aprovações e avisos para clientes.</p>
            </div>
            <span className="text-[10px] font-mono-kasa uppercase px-2 py-1 rounded bg-muted text-muted-foreground shrink-0">
              Em breve
            </span>
          </div>

          <div className="flex items-center gap-3 border border-border rounded-lg p-4 bg-background/40 opacity-70">
            <div className="size-10 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Mail className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">E-mail transacional</p>
              <p className="text-xs text-foreground/50">Disparos automáticos (Resend).</p>
            </div>
            <span className="text-[10px] font-mono-kasa uppercase px-2 py-1 rounded bg-muted text-muted-foreground shrink-0">
              Em breve
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
