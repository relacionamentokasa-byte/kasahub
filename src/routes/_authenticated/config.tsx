import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Loader2, Bell, Building2, Palette, Plug, Sun, Moon, UserCog } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchAgencySettings,
  updateAgencySettings,
  type AgencySettings,
} from "@/lib/settings-api";
import { fetchCurrentUserRoles, hasAnyRole } from "@/lib/roles-api";

export const Route = createFileRoute("/_authenticated/config")({
  head: () => ({ meta: [{ title: "Configurações — KASA OS" }] }),
  component: ConfigPage,
});

function ConfigPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["agency-settings"],
    queryFn: fetchAgencySettings,
  });
  const { data: myRoles = [] } = useQuery({
    queryKey: ["roles", "me"],
    queryFn: fetchCurrentUserRoles,
  });
  const canEdit = hasAnyRole(myRoles, ["admin", "ceo"]);

  const [form, setForm] = useState<Partial<AgencySettings>>({});
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const mut = useMutation({
    mutationFn: () => updateAgencySettings(data!.id, form),
    onSuccess: () => {
      toast.success("Configurações salvas");
      qc.invalidateQueries({ queryKey: ["agency-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof AgencySettings>(k: K, v: AgencySettings[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  if (isLoading || !data) {
    return (
      <div className="p-12 flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-6 lg:px-10 py-8 space-y-6 max-w-5xl mx-auto">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span className="text-[10px] font-mono-kasa uppercase tracking-[0.25em] text-primary font-semibold">
            Sistema · Configurações
          </span>
          <h1 className="font-display text-3xl font-bold mt-1">Configurações da agência</h1>
          <p className="text-foreground/60 text-sm mt-1">
            Dados, branding, notificações e integrações do KASA OS.
          </p>
        </div>
        <Button
          onClick={() => mut.mutate()}
          disabled={!canEdit || mut.isPending}
          className="gap-2"
        >
          {mut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar alterações
        </Button>
      </header>

      {!canEdit && (
        <div className="text-xs text-foreground/50 border border-border bg-surface rounded-lg px-4 py-3">
          Você está em modo somente leitura. Somente admin e CEO podem editar.
        </div>
      )}

      <Tabs defaultValue="agency" className="space-y-6">
        <TabsList>
          <TabsTrigger value="agency" className="gap-2"><Building2 className="size-3.5" /> Identidade</TabsTrigger>
          <TabsTrigger value="brand" className="gap-2"><Palette className="size-3.5" /> Branding</TabsTrigger>
          <TabsTrigger value="notif" className="gap-2"><Bell className="size-3.5" /> Notificações</TabsTrigger>
          <TabsTrigger value="integr" className="gap-2"><Plug className="size-3.5" /> Integrações</TabsTrigger>
        </TabsList>

        <TabsContent value="agency" className="space-y-4">
          <Card>
            <Grid>
              <Field label="Nome fantasia">
                <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} disabled={!canEdit} />
              </Field>
              <Field label="Razão social">
                <Input value={form.legal_name ?? ""} onChange={(e) => set("legal_name", e.target.value)} disabled={!canEdit} />
              </Field>
              <Field label="CNPJ / Documento">
                <Input value={form.document ?? ""} onChange={(e) => set("document", e.target.value)} disabled={!canEdit} />
              </Field>
              <Field label="E-mail">
                <Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} disabled={!canEdit} />
              </Field>
              <Field label="Telefone">
                <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} disabled={!canEdit} />
              </Field>
              <Field label="Site">
                <Input value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} disabled={!canEdit} />
              </Field>
            </Grid>
            <Field label="Endereço" className="mt-4">
              <Textarea value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} disabled={!canEdit} rows={2} />
            </Field>
            <Grid className="mt-4">
              <Field label="Moeda padrão">
                <Input value={form.default_currency ?? "BRL"} onChange={(e) => set("default_currency", e.target.value)} disabled={!canEdit} />
              </Field>
              <Field label="Fuso horário">
                <Input value={form.timezone ?? ""} onChange={(e) => set("timezone", e.target.value)} disabled={!canEdit} />
              </Field>
            </Grid>
          </Card>
        </TabsContent>

        <TabsContent value="brand" className="space-y-4">
          <Card>
            <Grid>
              <Field label="Logo (URL)">
                <Input value={form.logo_url ?? ""} onChange={(e) => set("logo_url", e.target.value)} disabled={!canEdit} />
              </Field>
              <Field label="Banner (URL)">
                <Input value={form.banner_url ?? ""} onChange={(e) => set("banner_url", e.target.value)} disabled={!canEdit} />
              </Field>
              <Field label="Cor primária">
                <div className="flex gap-2">
                  <Input type="color" value={form.brand_primary ?? "#FFBC45"} onChange={(e) => set("brand_primary", e.target.value)} disabled={!canEdit} className="w-16 p-1 h-10" />
                  <Input value={form.brand_primary ?? ""} onChange={(e) => set("brand_primary", e.target.value)} disabled={!canEdit} />
                </div>
              </Field>
              <Field label="Cor secundária">
                <div className="flex gap-2">
                  <Input type="color" value={form.brand_secondary ?? "#000000"} onChange={(e) => set("brand_secondary", e.target.value)} disabled={!canEdit} className="w-16 p-1 h-10" />
                  <Input value={form.brand_secondary ?? ""} onChange={(e) => set("brand_secondary", e.target.value)} disabled={!canEdit} />
                </div>
              </Field>
            </Grid>
            {form.logo_url && (
              <div className="mt-6 p-6 rounded-lg bg-background/40 border border-border flex items-center gap-4">
                <img src={form.logo_url} alt="Logo" className="h-12 w-auto" />
                <span className="text-xs text-foreground/40 font-mono-kasa uppercase tracking-widest">Preview</span>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="notif" className="space-y-4">
          <Card>
            <ToggleRow
              title="Notificações por e-mail"
              description="Enviar alertas e resumos por e-mail."
              checked={form.notify_email ?? true}
              onChange={(v) => set("notify_email", v)}
              disabled={!canEdit}
            />
            <ToggleRow
              title="Notificações por WhatsApp"
              description="Disparos automáticos via WhatsApp (exige integração)."
              checked={form.notify_whatsapp ?? false}
              onChange={(v) => set("notify_whatsapp", v)}
              disabled={!canEdit}
            />
          </Card>
        </TabsContent>

        <TabsContent value="integr" className="space-y-4">
          <Card>
            <div className="space-y-3">
              {[
                { id: "google_calendar", name: "Google Agenda", desc: "Sincronizar calendário editorial." },
                { id: "resend", name: "Resend", desc: "Disparo transacional de e-mails." },
                { id: "whatsapp", name: "WhatsApp Business", desc: "Aprovações e avisos para clientes." },
                { id: "stripe", name: "Stripe", desc: "Cobrança recorrente (futuro)." },
              ].map((it) => {
                const integ = (form.integrations as Record<string, { connected?: boolean }> | undefined) ?? {};
                const connected = integ[it.id]?.connected ?? false;
                return (
                  <div key={it.id} className="flex items-center justify-between border border-border rounded-lg p-4 bg-background/40">
                    <div>
                      <p className="font-medium text-sm">{it.name}</p>
                      <p className="text-xs text-foreground/50">{it.desc}</p>
                    </div>
                    <span className={`text-[10px] font-mono-kasa uppercase tracking-widest px-2 py-1 rounded ${connected ? "bg-emerald-500/15 text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                      {connected ? "Conectado" : "Desconectado"}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-foreground/40 mt-4">
              As conexões OAuth com cada serviço serão configuradas na Fase 9.
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-surface p-6">{children}</div>;
}

function Grid({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>{children}</div>;
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-foreground/60">
        {label}
      </Label>
      {children}
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-foreground/50">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}
