import type { AgencySettings } from "@/lib/settings-api";

export function IntegrationsTab({ form }: { form: Partial<AgencySettings> }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="space-y-3">
        {[
          { id: "google_calendar", name: "Google Agenda", desc: "Sincronizar calendário editorial." },
          { id: "resend", name: "Resend", desc: "Disparo transacional de e-mails." },
          { id: "whatsapp", name: "WhatsApp Business", desc: "Aprovações e avisos para clientes." },
          { id: "stripe", name: "Stripe", desc: "Cobrança recorrente (futuro)." },
        ].map((it) => {
          const integ = (form.integrations as Record<string, { connected?: boolean }> | undefined) ?? {};
          const connected = it.id === 'whatsapp' ? true : (integ[it.id]?.connected ?? false);
          return (
            <div key={it.id} className="flex items-center justify-between border border-border rounded-lg p-4 bg-background/40">
              <div>
                <p className="font-medium text-sm">{it.name}</p>
                <p className="text-xs text-foreground/50">{it.desc}</p>
              </div>
              <span className={`text-[10px] font-mono-kasa capitalize px-2 py-1 rounded ${connected ? "bg-emerald-500/15 text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                {connected ? "Conectado" : "Desconectado"}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-foreground/40 mt-4">
        Comunicação direta via WhatsApp Web ativada para o CRM.
      </p>
    </div>
  );
}
