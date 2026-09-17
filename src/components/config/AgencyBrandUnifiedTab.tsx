import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProfileImageUpload } from "@/components/profile/ProfileImageUpload";
import type { AgencySettings } from "@/lib/settings-api";
import { Building2, Palette, Pencil, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandingAsset {
  key: keyof AgencySettings;
  label: string;
  usage: string;
  recommendedSize: string;
  formats: string[];
  description: string;
  previewBg?: "dark" | "light";
}

const BRANDING_ASSETS: BrandingAsset[] = [
  {
    key: "logo_proposals_url",
    label: "Logo da Proposta Pública",
    usage: "Topo da proposta comercial enviada ao cliente",
    recommendedSize: "1200x400px (Horizontal)",
    formats: ["PNG Transparente", "SVG", "JPG"],
    description: "Aparecerá no cabeçalho das propostas comerciais públicas.",
    previewBg: "light",
  },
  {
    key: "logo_white_url",
    label: "Logo Branca (Fundo Escuro)",
    usage: "Menu lateral do sistema e tela de login",
    recommendedSize: "1200x400px (Horizontal)",
    formats: ["PNG Transparente", "SVG"],
    description: "Versão branca para aplicação sobre superfícies escuras.",
    previewBg: "dark",
  },
  {
    key: "logo_black_url",
    label: "Logo Preta (Fundo Claro)",
    usage: "Recibos, relatórios e documentos impressos",
    recommendedSize: "1200x400px (Horizontal)",
    formats: ["PNG Transparente", "SVG"],
    description: "Versão preta para documentos e áreas claras.",
    previewBg: "light",
  },
  {
    key: "logo_yellow_url",
    label: "Símbolo / Ícone",
    usage: "Favicon, tela de carregamento e app PWA",
    recommendedSize: "512x512px (Quadrado)",
    formats: ["PNG Transparente", "SVG"],
    description: "Ícone quadrado em cor primária para atalhos e splash screen.",
    previewBg: "light",
  },
];

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

export function AgencyBrandUnifiedTab({
  form,
  set,
  canEdit,
}: {
  form: Partial<AgencySettings>;
  set: <K extends keyof AgencySettings>(k: K, v: AgencySettings[K]) => void;
  canEdit: boolean;
}) {
  const [subTab, setSubTab] = useState<"cadastral" | "branding" | "contract">("cadastral");

  return (
    <div className="space-y-6">
      {/* Sub-navegação interna */}
      <div className="flex items-center gap-2 p-1 bg-muted/40 rounded-xl border border-border/70 max-w-fit">
        <button
          type="button"
          onClick={() => setSubTab("cadastral")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all",
            subTab === "cadastral"
              ? "bg-background text-foreground shadow-sm border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Building2 className="size-3.5" />
          Dados Cadastrais
        </button>

        <button
          type="button"
          onClick={() => setSubTab("branding")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all",
            subTab === "branding"
              ? "bg-background text-foreground shadow-sm border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Palette className="size-3.5" />
          Logos & Cores
        </button>

        <button
          type="button"
          onClick={() => setSubTab("contract")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all",
            subTab === "contract"
              ? "bg-background text-foreground shadow-sm border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Pencil className="size-3.5" />
          Assinatura de Contratos
        </button>
      </div>

      {/* Sub-aba 1: Dados Cadastrais */}
      {subTab === "cadastral" && (
        <div className="rounded-xl border border-border bg-surface p-6 space-y-6">
          <div>
            <h3 className="font-display text-lg font-semibold">Identidade Cadastral</h3>
            <p className="text-xs text-foreground/50">
              Dados utilizados nos cabeçalhos de propostas, recibos de pagamento, contratos e relatórios oficiais.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome do Sistema (HUB)">
              <Input
                value={form.name ?? ""}
                onChange={(e) => set("name", e.target.value)}
                disabled={!canEdit}
                placeholder="Ex: KASA HUB"
              />
            </Field>
            <Field label="Razão Social">
              <Input
                value={form.legal_name ?? ""}
                onChange={(e) => set("legal_name", e.target.value)}
                disabled={!canEdit}
                placeholder="Ex: Kasa Comunicação LTDA"
              />
            </Field>
            <Field label="CNPJ / Documento">
              <Input
                value={form.document ?? ""}
                onChange={(e) => set("document", e.target.value)}
                disabled={!canEdit}
                placeholder="00.000.000/0001-00"
                className="font-mono-kasa tabular-nums"
              />
            </Field>
            <Field label="E-mail Institucional">
              <Input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => set("email", e.target.value)}
                disabled={!canEdit}
              />
            </Field>
            <Field label="Telefone / Contato">
              <Input
                value={form.phone ?? ""}
                onChange={(e) => set("phone", e.target.value)}
                disabled={!canEdit}
              />
            </Field>
            <Field label="Website">
              <Input
                value={form.website ?? ""}
                onChange={(e) => set("website", e.target.value)}
                disabled={!canEdit}
                placeholder="https://..."
              />
            </Field>
            <Field label="Endereço Completo" className="md:col-span-2">
              <Textarea
                value={form.address ?? ""}
                onChange={(e) => set("address", e.target.value)}
                disabled={!canEdit}
                rows={2}
                placeholder="Rua, número, complemento, bairro, cidade - UF, CEP"
              />
            </Field>
            <Field label="Moeda Padrão">
              <Input
                value={form.default_currency ?? "BRL"}
                onChange={(e) => set("default_currency", e.target.value)}
                disabled={!canEdit}
                className="font-mono-kasa"
              />
            </Field>
            <Field label="Fuso Horário">
              <Input
                value={form.timezone ?? "America/Sao_Paulo"}
                onChange={(e) => set("timezone", e.target.value)}
                disabled={!canEdit}
              />
            </Field>
            <Field label="Rodapé Padrão dos Documentos e Demandas Extras (DME)" className="md:col-span-2">
              <Textarea
                value={form.dme_pdf_footer ?? ""}
                onChange={(e) => set("dme_pdf_footer", e.target.value)}
                disabled={!canEdit}
                rows={3}
                placeholder="Ex: Obrigado pela parceria! Para dúvidas e suporte financeiro: contato@suaempresa.com"
              />
            </Field>
          </div>
        </div>
      )}

      {/* Sub-aba 2: Logos & Cores */}
      {subTab === "branding" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="mb-6">
              <h3 className="font-display text-lg font-semibold">Cores da Agência</h3>
              <p className="text-xs text-foreground/50">Paleta primária e secundária aplicada nas propostas e documentos.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-mono-kasa capitalize text-foreground/60 font-semibold">Cor Primária</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={form.brand_primary ?? "#FFBC45"}
                    onChange={(e) => set("brand_primary", e.target.value)}
                    disabled={!canEdit}
                    className="w-16 p-1 h-9 cursor-pointer rounded-lg"
                  />
                  <Input
                    value={form.brand_primary ?? ""}
                    onChange={(e) => set("brand_primary", e.target.value)}
                    disabled={!canEdit}
                    className="h-9 font-mono-kasa text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-mono-kasa capitalize text-foreground/60 font-semibold">Cor Secundária</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={form.brand_secondary ?? "#000000"}
                    onChange={(e) => set("brand_secondary", e.target.value)}
                    disabled={!canEdit}
                    className="w-16 p-1 h-9 cursor-pointer rounded-lg"
                  />
                  <Input
                    value={form.brand_secondary ?? ""}
                    onChange={(e) => set("brand_secondary", e.target.value)}
                    disabled={!canEdit}
                    className="h-9 font-mono-kasa text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="mb-6">
              <h3 className="font-display text-lg font-semibold">Arquivos de Marca & Logos</h3>
              <p className="text-xs text-foreground/50">Envie as variações oficiais de logo para propostas, PDFs e sistema.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {BRANDING_ASSETS.map((asset) => {
                const currentUrl = form[asset.key] as string | undefined;
                return (
                  <div key={asset.key} className="p-4 rounded-xl border border-border/80 bg-background/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground">{asset.label}</Label>
                      <span className="text-[10px] font-mono-kasa text-muted-foreground">{asset.recommendedSize}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{asset.description}</p>

                    <div className="space-y-2">
                      <ProfileImageUpload
                        value={currentUrl}
                        onChange={(url) => set(asset.key, url as any)}
                        label={asset.label}
                        bucket="branding"
                        folder="logos"
                      />

                      {currentUrl && (
                        <div
                          className={cn(
                            "p-3 rounded-lg border border-border flex items-center justify-center min-h-[70px]",
                            asset.previewBg === "dark" ? "bg-[#0c1618]" : "bg-white"
                          )}
                        >
                          <img src={currentUrl} alt={asset.label} className="max-h-[50px] max-w-[200px] object-contain" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Sub-aba 3: Assinatura */}
      {subTab === "contract" && (
        <div className="rounded-xl border border-border bg-surface p-6 space-y-6">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
              <FileText className="size-4" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">Assinatura da Empresa</h3>
              <p className="text-xs text-foreground/50">
                Esta assinatura é carimbada automaticamente no fechamento e emissão de contratos jurídicos das propostas aceitas.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 pt-2">
            <div className="space-y-3">
              <Label className="text-[10px] font-mono-kasa capitalize text-foreground/60 font-semibold">Assinatura Digitalizada</Label>
              <ProfileImageUpload
                value={form.agency_signature_url}
                onChange={(url) => set("agency_signature_url", url)}
                label="Assinatura"
                shape="rect"
                aspect={3 / 1}
                bucket="signatures"
                folder="company"
              />
              <p className="text-[10px] text-foreground/40 font-mono-kasa">
                Proporção sugerida: 3:1 (ex: 300x100px). Utilize fundo transparente (PNG).
              </p>
            </div>

            {form.agency_signature_url && (
              <div className="space-y-2">
                <Label className="text-[10px] font-mono-kasa capitalize text-foreground/60">Prévia no Documento</Label>
                <div className="p-4 rounded-xl bg-white border border-border flex flex-col items-center justify-center min-h-[140px] gap-2">
                  <img
                    src={form.agency_signature_url}
                    alt="Assinatura da Empresa"
                    className="w-full max-w-[260px] h-[75px] object-contain"
                  />
                  <div className="w-48 border-t border-neutral-900 mt-1 pt-1 text-center">
                    <span className="text-[10px] font-semibold text-neutral-800 uppercase tracking-wider block">
                      {form.legal_name || form.name || "Agência KASA"}
                    </span>
                    {form.document && (
                      <span className="text-[9px] text-neutral-500 font-mono-kasa block">
                        CNPJ: {form.document}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
