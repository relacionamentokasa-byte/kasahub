import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Loader2, Bell, Building2, Palette, Plug, Sun, Moon, UserCog, Shield, Briefcase, FileText, User } from "lucide-react";
import { ServicesManager } from "@/components/config/ServicesManager";
import { PermissionsManager } from "@/components/PermissionsManager";
import { ContractTemplatesManager } from "@/components/config/ContractTemplatesManager";
import { useTheme } from "@/lib/theme";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/use-permissions";
import {
  fetchAgencySettings,
  updateAgencySettings,
  type AgencySettings,
} from "@/lib/settings-api";
import { fetchMyProfile, updateMyProfile } from "@/lib/profile-api";
import { ImageUpload } from "@/components/ui/image-upload";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/config")({
  head: () => ({ meta: [{ title: "Configurações — KASA OS" }] }),
  component: ConfigPage,
});

function ConfigPage() {
  const qc = useQueryClient();
  const { can, isLoading: permissionsLoading } = usePermissions();
  const { data, isLoading } = useQuery({
    queryKey: ["agency-settings"],
    queryFn: fetchAgencySettings,
  });
  const canEdit = can("config", "edit");

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

  if (isLoading || permissionsLoading || !data) {
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
          <span className="text-[10px] font-mono-kasa capitalize text-primary font-semibold">
            Sistema · Configurações
          </span>
          <h1 className="font-display text-3xl font-bold mt-1">Configurações da agência</h1>
          <p className="text-foreground/60 text-sm mt-1">
            Dados, identidade visual, notificações e integrações do KASA OS.
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
          Você está em modo somente leitura. Seu perfil precisa da permissão de editar Configurações.
        </div>
      )}

      <Tabs defaultValue="agency" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2"><User className="size-3.5" /> Meu Perfil</TabsTrigger>
          <TabsTrigger value="agency" className="gap-2"><Building2 className="size-3.5" /> Identidade</TabsTrigger>
          <TabsTrigger value="brand" className="gap-2"><Palette className="size-3.5" /> Identidade Visual</TabsTrigger>
          <TabsTrigger value="perms" className="gap-2"><Shield className="size-3.5" /> Perfis e Permissões</TabsTrigger>
          <TabsTrigger value="services" className="gap-2"><Briefcase className="size-3.5" /> Serviços</TabsTrigger>
          <TabsTrigger value="contracts" className="gap-2"><FileText className="size-3.5" /> Contratos</TabsTrigger>
          <TabsTrigger value="notif" className="gap-2"><Bell className="size-3.5" /> Notificações</TabsTrigger>
          <TabsTrigger value="integr" className="gap-2"><Plug className="size-3.5" /> Integrações</TabsTrigger>
          <TabsTrigger value="prefs" className="gap-2"><UserCog className="size-3.5" /> Preferências</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <UserProfileTab />
        </TabsContent>

        <TabsContent value="perms" className="space-y-4">
          <PermissionsManager canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="prefs" className="space-y-4">
          <Card>
            <ThemePreference />
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <ServicesManager canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="contracts" className="space-y-4">
          <ContractTemplatesManager canEdit={canEdit} />
        </TabsContent>

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
                <span className="text-xs text-foreground/40 font-mono-kasa capitalize">Visualização</span>
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
                    <span className={`text-[10px] font-mono-kasa capitalize px-2 py-1 rounded ${connected ? "bg-emerald-500/15 text-emerald-300" : "bg-muted text-muted-foreground"}`}>
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
      <Label className="text-[10px] font-mono-kasa capitalize text-foreground/60">
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

function ThemePreference() {
  const { theme, setTheme } = useTheme();
  const options: { value: "light" | "dark"; label: string; desc: string; icon: typeof Sun }[] = [
    { value: "light", label: "Claro", desc: "Fundo claro, leve e produtivo.", icon: Sun },
    { value: "dark", label: "Escuro", desc: "Padrão Kasa, sofisticado e contrastado.", icon: Moon },
  ];
  return (
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
  );
}

function UserProfileTab() {
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: fetchMyProfile,
  });

  const [form, setForm] = useState<any>({});
  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const mut = useMutation({
    mutationFn: () => updateMyProfile(form),
    onSuccess: () => {
      toast.success("Perfil atualizado");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !profile) return <Loader2 className="animate-spin mx-auto" />;

  return (
    <Card>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/3 space-y-4">
          <Label className="text-[10px] font-mono-kasa capitalize text-foreground/60">Foto de perfil</Label>
          <ImageUpload
            value={form.avatar_url}
            onChange={(url) => setForm({ ...form, avatar_url: url })}
            folder="avatars"
            label="Sua Foto"
          />
          <p className="text-[10px] text-foreground/40 text-center">
            Recomendado: 400x400px (JPG, PNG ou WebP)
          </p>
        </div>

        <div className="flex-1 space-y-4">
          <Grid>
            <Field label="Nome completo">
              <Input 
                value={form.full_name ?? ""} 
                onChange={(e) => setForm({ ...form, full_name: e.target.value })} 
              />
            </Field>
            <Field label="Nome de exibição">
              <Input 
                value={form.display_name ?? ""} 
                onChange={(e) => setForm({ ...form, display_name: e.target.value })} 
                placeholder="Como quer ser chamado"
              />
            </Field>
            <Field label="Cargo / Função">
              <Input 
                value={form.job_title ?? ""} 
                onChange={(e) => setForm({ ...form, job_title: e.target.value })} 
              />
            </Field>
            <Field label="Telefone / WhatsApp">
              <Input 
                value={form.phone ?? ""} 
                onChange={(e) => setForm({ ...form, phone: e.target.value })} 
              />
            </Field>
          </Grid>
          
          <div className="pt-4 border-t border-border mt-4">
            <Button 
              onClick={() => mut.mutate()} 
              disabled={mut.isPending}
              className="w-full md:w-auto"
            >
              {mut.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
              Salvar meu perfil
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
