import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listLeadSources,
  upsertLeadSource,
  deleteLeadSource,
  regenerateLeadSourceSecret,
  listLeadSourceSubmissions,
} from "@/lib/leadSources.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Copy, ExternalLink, RefreshCw, Trash2, Eye, EyeOff,
  Loader2, CheckCircle2, XCircle, Globe, Code2, Pencil, Upload, X,
} from "lucide-react";
import { toast } from "sonner";

const APP_ORIGIN = typeof window !== "undefined" ? window.location.origin : "https://kasahub.lovable.app";

const FORM_FIELD_OPTIONS = [
  { id: "name", label: "Nome" },
  { id: "email", label: "E-mail" },
  { id: "phone", label: "Telefone / WhatsApp" },
  { id: "company", label: "Empresa" },
  { id: "message", label: "Mensagem" },
  { id: "budget", label: "Investimento" },
];

type LeadSource = any;

function emptySource(): Partial<LeadSource> {
  return {
    name: "",
    slug: "",
    is_active: true,
    notify_user_ids: [],
    landing_headline: "",
    landing_subheadline: "",
    landing_description: "",
    landing_cta_label: "Quero falar com a Kasa",
    landing_logo_url: "",
    landing_hero_image_url: "",
    landing_bg_color: "",
    landing_accent_color: "",
    landing_benefits: [],
    landing_testimonials: [],
    landing_form_fields: ["name", "email", "phone", "message"],
    landing_success_message: "",
    landing_redirect_url: "",
    pixel_meta_id: "",
    gtag_id: "",
    default_stage_id: null,
  };
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function LeadSourcesPanel() {
  const qc = useQueryClient();
  const listFn = useServerFn(listLeadSources);
  const { data: sources, isLoading } = useQuery({ queryKey: ["lead-sources"], queryFn: () => listFn() });

  const { data: stages } = useQuery({
    queryKey: ["lead-stages"],
    queryFn: async () => {
      const { data } = await supabase.from("lead_stages").select("id, name").order("order_index");
      return data ?? [];
    },
  });

  const { data: teamMembers } = useQuery({
    queryKey: ["team-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, display_name, full_name").limit(100);
      return data ?? [];
    },
  });

  const [editing, setEditing] = useState<Partial<LeadSource> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<LeadSource | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <p className="text-sm text-foreground/60 max-w-2xl">
          Cada fonte gera uma URL de webhook (para Meta Ads, Google Ads, formulários externos) e uma landing page hospedada em <code className="text-xs bg-muted px-1 rounded">/captar/{`{slug}`}</code>. Personalize a landing por fonte para maximizar conversão.
        </p>
        <Button onClick={() => setEditing(emptySource())} className="gap-2">
          <Plus className="size-4" /> Nova fonte
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : !sources?.length ? (
        <div className="border border-dashed border-border rounded-xl p-10 text-center">
          <Globe className="size-10 mx-auto text-foreground/30 mb-3" />
          <h3 className="font-semibold mb-1">Nenhuma fonte cadastrada</h3>
          <p className="text-sm text-foreground/50 mb-4">Crie sua primeira fonte para começar a capturar leads.</p>
          <Button onClick={() => setEditing(emptySource())} className="gap-2"><Plus className="size-4" /> Criar fonte</Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {sources.map((s: any) => (
            <div key={s.id} className="border border-border rounded-xl p-5 bg-card hover:border-primary/40 transition">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-base">{s.name}</h3>
                    {s.is_active ? (
                      <Badge variant="outline" className="text-[10px] gap-1 border-green-500/30 text-green-600"><CheckCircle2 className="size-3" /> Ativa</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] gap-1"><XCircle className="size-3" /> Pausada</Badge>
                    )}
                  </div>
                  <code className="text-xs text-foreground/50">/{s.slug}</code>
                  <div className="flex gap-4 mt-3 text-xs text-foreground/60">
                    <span><strong className="text-foreground">{s.lead_count}</strong> leads</span>
                    {s.last_submission_at && (
                      <span>Último: {new Date(s.last_submission_at).toLocaleString("pt-BR")}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/captar/${s.slug}`} target="_blank" rel="noreferrer" className="gap-1">
                      <ExternalLink className="size-3.5" /> Landing
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditing(s)} className="gap-1">
                    <Pencil className="size-3.5" /> Editar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <SourceEditor
          source={editing}
          stages={stages ?? []}
          teamMembers={teamMembers ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["lead-sources"] }); setEditing(null); }}
          onAskDelete={(s) => setConfirmDelete(s)}
        />
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fonte "{confirmDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              A landing page e o webhook vão parar de funcionar imediatamente. Os leads já capturados continuam no CRM.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmDelete?.id) return;
                try {
                  await deleteLeadSource({ data: { id: confirmDelete.id } });
                  toast.success("Fonte excluída");
                  qc.invalidateQueries({ queryKey: ["lead-sources"] });
                  setConfirmDelete(null);
                  setEditing(null);
                } catch (e: any) { toast.error(e.message); }
              }}
              className="bg-destructive text-destructive-foreground"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SourceEditor({
  source, stages, teamMembers, onClose, onSaved, onAskDelete,
}: {
  source: Partial<LeadSource>;
  stages: { id: string; name: string }[];
  teamMembers: { id: string; display_name: string | null; full_name: string | null }[];
  onClose: () => void;
  onSaved: () => void;
  onAskDelete: (s: LeadSource) => void;
}) {
  const [f, setF] = useState<Partial<LeadSource>>(source);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const isNew = !f.id;

  const upsert = async () => {
    setSaving(true);
    try {
      const payload = {
        id: f.id,
        name: f.name?.trim() || "",
        slug: (f.slug || "").trim() || slugify(f.name || ""),
        is_active: !!f.is_active,
        default_stage_id: f.default_stage_id || null,
        notify_user_ids: f.notify_user_ids || [],
        landing_headline: f.landing_headline || null,
        landing_subheadline: f.landing_subheadline || null,
        landing_description: f.landing_description || null,
        landing_cta_label: f.landing_cta_label || null,
        landing_logo_url: f.landing_logo_url || "",
        landing_hero_image_url: f.landing_hero_image_url || "",
        landing_bg_color: f.landing_bg_color || null,
        landing_accent_color: f.landing_accent_color || null,
        landing_benefits: f.landing_benefits || [],
        landing_testimonials: f.landing_testimonials || [],
        landing_form_fields: f.landing_form_fields || [],
        landing_success_message: f.landing_success_message || null,
        landing_redirect_url: f.landing_redirect_url || "",
        pixel_meta_id: f.pixel_meta_id || null,
        gtag_id: f.gtag_id || null,
      };
      await upsertLeadSource({ data: payload as any });
      toast.success(isNew ? "Fonte criada" : "Fonte atualizada");
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const regen = async () => {
    if (!f.id) return;
    try {
      const updated = await regenerateLeadSourceSecret({ data: { id: f.id } });
      setF((p) => ({ ...p, secret: (updated as any).secret }));
      toast.success("Secret regenerado");
    } catch (e: any) { toast.error(e.message); }
  };

  const webhookUrl = useMemo(() => {
    if (!f.slug || !f.secret) return "";
    return `${APP_ORIGIN}/api/public/leads/inbound?source=${f.slug}&secret=${f.secret}`;
  }, [f.slug, f.secret]);

  const landingUrl = f.slug ? `${APP_ORIGIN}/captar/${f.slug}` : "";

  return (
    <Sheet open={true} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isNew ? "Nova fonte de lead" : f.name}</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="general" className="mt-6">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="landing">Landing</TabsTrigger>
            <TabsTrigger value="integration" disabled={isNew}>Integração</TabsTrigger>
            <TabsTrigger value="history" disabled={isNew}>Histórico</TabsTrigger>
          </TabsList>

          {/* GERAL */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <Field label="Nome da fonte *">
              <Input
                value={f.name || ""}
                onChange={(e) => {
                  const name = e.target.value;
                  setF((p) => ({ ...p, name, slug: isNew && !p.slug ? slugify(name) : p.slug }));
                }}
                placeholder="Ex: Google Ads — Identidade Visual"
              />
            </Field>
            <Field label="Slug (URL) *" hint={landingUrl}>
              <Input
                value={f.slug || ""}
                onChange={(e) => setF((p) => ({ ...p, slug: slugify(e.target.value) }))}
                placeholder="ex: identidade-visual"
              />
            </Field>
            <div className="flex items-center justify-between border border-border rounded-lg p-3">
              <div>
                <div className="font-medium text-sm">Fonte ativa</div>
                <div className="text-xs text-foreground/50">Quando desativada, landing e webhook param de funcionar.</div>
              </div>
              <Switch checked={!!f.is_active} onCheckedChange={(v) => setF((p) => ({ ...p, is_active: v }))} />
            </div>
            <Field label="Estágio inicial no CRM">
              <Select value={f.default_stage_id || ""} onValueChange={(v) => setF((p) => ({ ...p, default_stage_id: v || null }))}>
                <SelectTrigger><SelectValue placeholder="Primeiro estágio do funil" /></SelectTrigger>
                <SelectContent>
                  {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Notificar (quando novo lead chegar)">
              <div className="border border-border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {teamMembers.length === 0 && <div className="text-sm text-foreground/40">Sem membros disponíveis.</div>}
                {teamMembers.map((m) => {
                  const checked = (f.notify_user_ids || []).includes(m.id);
                  return (
                    <label key={m.id} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const cur = new Set(f.notify_user_ids || []);
                          if (e.target.checked) cur.add(m.id); else cur.delete(m.id);
                          setF((p) => ({ ...p, notify_user_ids: Array.from(cur) }));
                        }}
                      />
                      {m.display_name || m.full_name || m.id.slice(0, 8)}
                    </label>
                  );
                })}
              </div>
            </Field>
          </TabsContent>

          {/* LANDING */}
          <TabsContent value="landing" className="space-y-4 mt-4">
            <Field label="Headline (título principal)">
              <Input value={f.landing_headline || ""} onChange={(e) => setF((p) => ({ ...p, landing_headline: e.target.value }))} placeholder="Construa uma marca que vende sozinha." />
            </Field>
            <Field label="Subheadline">
              <Input value={f.landing_subheadline || ""} onChange={(e) => setF((p) => ({ ...p, landing_subheadline: e.target.value }))} placeholder="Identidade visual estratégica em até 30 dias." />
            </Field>
            <Field label="Descrição">
              <Textarea rows={3} value={f.landing_description || ""} onChange={(e) => setF((p) => ({ ...p, landing_description: e.target.value }))} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Texto do botão">
                <Input value={f.landing_cta_label || ""} onChange={(e) => setF((p) => ({ ...p, landing_cta_label: e.target.value }))} />
              </Field>
              <Field label="Cor de destaque (hex/hsl)">
                <Input value={f.landing_accent_color || ""} onChange={(e) => setF((p) => ({ ...p, landing_accent_color: e.target.value }))} placeholder="#FFBC45" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Logo da landing">
                <ImageUploadField
                  value={f.landing_logo_url || ""}
                  onChange={(url) => setF((p) => ({ ...p, landing_logo_url: url }))}
                  folder="lead-sources/logos"
                />
              </Field>
              <Field label="Imagem de capa / OG">
                <ImageUploadField
                  value={f.landing_hero_image_url || ""}
                  onChange={(url) => setF((p) => ({ ...p, landing_hero_image_url: url }))}
                  folder="lead-sources/hero"
                />
              </Field>
            </div>

            <Field label="Benefícios (bullets)">
              <ListEditor
                items={f.landing_benefits || []}
                onChange={(items) => setF((p) => ({ ...p, landing_benefits: items }))}
                fields={[{ key: "title", placeholder: "Título" }, { key: "description", placeholder: "Descrição (opcional)" }]}
                addLabel="Adicionar benefício"
              />
            </Field>

            <Field label="Depoimentos">
              <ListEditor
                items={f.landing_testimonials || []}
                onChange={(items) => setF((p) => ({ ...p, landing_testimonials: items }))}
                fields={[
                  { key: "text", placeholder: "Texto do depoimento", textarea: true },
                  { key: "author", placeholder: "Autor" },
                  { key: "role", placeholder: "Cargo / empresa" },
                ]}
                addLabel="Adicionar depoimento"
              />
            </Field>

            <Field label="Campos do formulário">
              <div className="grid grid-cols-2 gap-2 border border-border rounded-lg p-3">
                {FORM_FIELD_OPTIONS.map((opt) => {
                  const checked = (f.landing_form_fields || []).includes(opt.id);
                  return (
                    <label key={opt.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const cur = new Set(f.landing_form_fields || []);
                          if (e.target.checked) cur.add(opt.id); else cur.delete(opt.id);
                          setF((p) => ({ ...p, landing_form_fields: Array.from(cur) }));
                        }}
                      />
                      {opt.label}
                    </label>
                  );
                })}
              </div>
            </Field>

            <Field label="Mensagem de sucesso (pós-envio)">
              <Textarea rows={2} value={f.landing_success_message || ""} onChange={(e) => setF((p) => ({ ...p, landing_success_message: e.target.value }))} placeholder="Obrigado! Entraremos em contato em breve." />
            </Field>
            <Field label="Ou redirecionar para URL (opcional)" hint="Se preenchido, ignora a mensagem acima.">
              <Input value={f.landing_redirect_url || ""} onChange={(e) => setF((p) => ({ ...p, landing_redirect_url: e.target.value }))} placeholder="https://wa.me/55..." />
            </Field>
          </TabsContent>

          {/* INTEGRAÇÃO */}
          <TabsContent value="integration" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>URL da Landing Page (compartilhável)</Label>
              <CopyRow value={landingUrl} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Webhook (Meta Ads / Google Ads / formulários)</Label>
                <Button variant="ghost" size="sm" onClick={regen} className="gap-1 text-xs">
                  <RefreshCw className="size-3" /> Regenerar secret
                </Button>
              </div>
              <CopyRow value={webhookUrl} masked={!showSecret} onToggleMask={() => setShowSecret(!showSecret)} />
              <p className="text-xs text-foreground/50">
                Envie POST com JSON contendo <code className="text-[10px] bg-muted px-1 rounded">name, email, phone, message, utm_*</code>. Pode usar nomes em português também.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Meta Pixel ID">
                <Input value={f.pixel_meta_id || ""} onChange={(e) => setF((p) => ({ ...p, pixel_meta_id: e.target.value }))} placeholder="000000000000000" />
              </Field>
              <Field label="Google Tag ID">
                <Input value={f.gtag_id || ""} onChange={(e) => setF((p) => ({ ...p, gtag_id: e.target.value }))} placeholder="G-XXXXX or AW-XXXXX" />
              </Field>
            </div>

            <div className="border border-border rounded-lg p-4 bg-muted/20">
              <div className="flex items-center gap-2 mb-2"><Code2 className="size-4 text-primary" /><strong className="text-sm">Exemplo cURL</strong></div>
              <pre className="text-[11px] bg-background border border-border rounded p-2 overflow-x-auto">
{`curl -X POST '${webhookUrl}' \\
  -H 'content-type: application/json' \\
  -d '{"name":"João","email":"joao@x.com","phone":"11999999999","message":"Quero saber mais"}'`}
              </pre>
            </div>
          </TabsContent>

          {/* HISTÓRICO */}
          <TabsContent value="history" className="mt-4">
            {f.id && <SubmissionHistory sourceId={f.id} />}
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between gap-2 mt-8 pt-6 border-t border-border">
          {!isNew ? (
            <Button variant="ghost" onClick={() => onAskDelete(f as LeadSource)} className="text-destructive gap-1">
              <Trash2 className="size-4" /> Excluir
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={upsert} disabled={saving || !f.name || !f.slug}>
              {saving && <Loader2 className="size-4 animate-spin mr-2" />} Salvar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-foreground/40 truncate">{hint}</p>}
    </div>
  );
}

function CopyRow({ value, masked, onToggleMask }: { value: string; masked?: boolean; onToggleMask?: () => void }) {
  const display = masked && value ? value.replace(/secret=[^&]+/, "secret=••••••••••••") : value;
  return (
    <div className="flex gap-2">
      <Input value={display} readOnly className="font-mono text-xs" />
      {onToggleMask && (
        <Button variant="outline" size="icon" onClick={onToggleMask} type="button">
          {masked ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
        </Button>
      )}
      <Button
        variant="outline"
        size="icon"
        onClick={() => {
          navigator.clipboard.writeText(value);
          toast.success("Copiado!");
        }}
        type="button"
      >
        <Copy className="size-4" />
      </Button>
    </div>
  );
}

function ListEditor({
  items, onChange, fields, addLabel,
}: {
  items: any[];
  onChange: (items: any[]) => void;
  fields: { key: string; placeholder: string; textarea?: boolean }[];
  addLabel: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="border border-border rounded-lg p-3 space-y-2 relative">
          <button
            type="button"
            onClick={() => onChange(items.filter((_, i) => i !== idx))}
            className="absolute top-2 right-2 text-foreground/40 hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </button>
          {fields.map((field) =>
            field.textarea ? (
              <Textarea
                key={field.key}
                rows={2}
                placeholder={field.placeholder}
                value={item[field.key] || ""}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...next[idx], [field.key]: e.target.value };
                  onChange(next);
                }}
              />
            ) : (
              <Input
                key={field.key}
                placeholder={field.placeholder}
                value={item[field.key] || ""}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...next[idx], [field.key]: e.target.value };
                  onChange(next);
                }}
              />
            )
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, {}])} className="gap-1">
        <Plus className="size-3.5" /> {addLabel}
      </Button>
    </div>
  );
}

function SubmissionHistory({ sourceId }: { sourceId: string }) {
  const listFn = useServerFn(listLeadSourceSubmissions);
  const { data, isLoading } = useQuery({
    queryKey: ["lead-source-submissions", sourceId],
    queryFn: () => listFn({ data: { sourceId } }),
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin" /></div>;
  if (!data?.length) return <p className="text-sm text-foreground/50 text-center py-8">Nenhuma submissão ainda.</p>;

  return (
    <div className="space-y-2 max-h-[420px] overflow-y-auto">
      {data.map((s: any) => (
        <div key={s.id} className="border border-border rounded-lg p-3 text-xs">
          <div className="flex items-center justify-between mb-1">
            <Badge variant={s.status === "error" ? "destructive" : "outline"} className="text-[10px]">{s.status}</Badge>
            <span className="text-foreground/40">{new Date(s.created_at).toLocaleString("pt-BR")}</span>
          </div>
          <div className="text-foreground/70">
            {(s.payload?.name || s.payload?.nome || "—")} {(s.payload?.email || s.payload?.phone) && `· ${s.payload.email || s.payload.phone}`}
          </div>
          {s.error_message && <div className="text-destructive mt-1">{s.error_message}</div>}
          {s.lead_id && (
            <a href={`/crm?leadId=${s.lead_id}`} className="text-primary text-[11px] mt-1 inline-block hover:underline">
              Ver lead no CRM →
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
