import { Label } from "@/components/ui/label";
import type { AgencySettings } from "@/lib/settings-api";
import { ProfileImageUpload } from "@/components/profile/ProfileImageUpload";
import { Info, Image as ImageIcon, CheckCircle2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface BrandingAsset {
  key: keyof AgencySettings;
  label: string;
  usage: string;
  recommendedSize: string;
  formats: string[];
  description: string;
  aspect?: number;
  previewBg?: "dark" | "light";
}

const BRANDING_ASSETS: BrandingAsset[] = [
  {
    key: "logo_proposals_url",
    label: "Logo da Proposta Pública",
    usage: "Exibida no topo da proposta comercial pública enviada aos clientes",
    recommendedSize: "1200x400px (Horizontal)",
    formats: ["PNG Transparente", "SVG", "JPG"],
    description: "Esta logo aparecerá no cabeçalho das suas propostas comerciais.",
    aspect: 1,
    previewBg: "light"
  },
  {
    key: "logo_white_url",
    label: "Logo Branca",
    usage: "Menu lateral (fundo escuro), Tela de login, Email de convite",
    recommendedSize: "1200x400px (Horizontal)",
    formats: ["PNG Transparente", "SVG"],
    description: "Versão branca ideal para aplicações sobre fundos escuros (#0c1618).",
    aspect: 1,
    previewBg: "dark"
  },
  {
    key: "logo_black_url",
    label: "Logo Preta",
    usage: "Relatórios, Documentos, Qualquer área com fundo claro",
    recommendedSize: "1200x400px (Horizontal)",
    formats: ["PNG Transparente", "SVG"],
    description: "Versão preta ideal para aplicações sobre fundos claros.",
    aspect: 1,
    previewBg: "light"
  },
  {
    key: "logo_yellow_url",
    label: "Logo Amarela",
    usage: "Tela de loading/splash, Favicon, Ícone do app",
    recommendedSize: "512x512px (Quadrado)",
    formats: ["PNG Transparente", "SVG"],
    description: "Versão amarela (cor primária) usada para carregamento e ícones.",
    aspect: 1,
    previewBg: "light"
  }
];

export function BrandTab({ form, set, canEdit }: { form: Partial<AgencySettings>, set: any, canEdit: boolean }) {
  const [validating, setValidating] = useState<string | null>(null);

  const handleUpload = (key: string, url: string | null) => {
    // Desabilitado conforme solicitação do usuário
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="rounded-xl border border-border bg-surface p-6">
        <h3 className="text-sm font-semibold mb-6 flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-primary" />
          Cores da Agência
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-mono-kasa capitalize text-foreground/60">Cor Primária</Label>
            <div className="flex gap-2">
              <Input type="color" value={form.brand_primary ?? "#FFBC45"} onChange={(e) => set("brand_primary", e.target.value)} disabled={!canEdit} className="w-16 p-1 h-10 cursor-pointer" />
              <Input value={form.brand_primary ?? ""} onChange={(e) => set("brand_primary", e.target.value)} disabled={!canEdit} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-mono-kasa capitalize text-foreground/60">Cor Secundária</Label>
            <div className="flex gap-2">
              <Input type="color" value={form.brand_secondary ?? "#000000"} onChange={(e) => set("brand_secondary", e.target.value)} disabled={!canEdit} className="w-16 p-1 h-10 cursor-pointer" />
              <Input value={form.brand_secondary ?? ""} onChange={(e) => set("brand_secondary", e.target.value)} disabled={!canEdit} />
            </div>
          </div>
        </div>

        <div className="space-y-10">
          <div className="grid grid-cols-1 gap-8">
            {BRANDING_ASSETS.map((asset) => (
              <div key={asset.key} className="flex flex-col lg:flex-row gap-8 items-start animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="w-full lg:w-[350px] shrink-0">
                  <div className={cn(
                    "relative group rounded-2xl border-2 border-dashed border-border overflow-hidden transition-all hover:border-primary/50",
                    asset.previewBg === "dark" ? "bg-[#0c1618]" : "bg-muted/10 shadow-inner"
                  )}>
                    <ProfileImageUpload
                      url={form[asset.key] as string || null}
                      onChange={(url) => set(asset.key, url)}
                      disabled={!canEdit}
                      className="w-full h-[180px]"
                      shape="square"
                      bucket="logos"
                    />
                    {!form[asset.key] && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-40">
                        <ImageIcon className="size-8 mb-2" />
                        <span className="text-[10px] font-mono-kasa uppercase tracking-widest">Aguardando Logo</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-4 pt-2">
                  <div>
                    <h4 className="text-lg font-bold flex items-center gap-2">
                      {asset.label}
                      {form[asset.key] ? (
                        <CheckCircle2 className="size-4 text-green-500" />
                      ) : (
                        <AlertCircle className="size-4 text-amber-500 opacity-50" />
                      )}
                    </h4>
                    <p className="text-sm text-foreground/60 leading-relaxed mt-1">{asset.description}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                    <div>
                      <p className="text-[10px] font-mono-kasa uppercase tracking-wider text-foreground/40 mb-1">Onde é usada</p>
                      <p className="text-xs font-medium text-foreground/70">{asset.usage}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono-kasa uppercase tracking-wider text-foreground/40 mb-1">Recomendação</p>
                      <p className="text-xs font-medium text-foreground/70">{asset.recommendedSize}</p>
                    </div>
                  </div>

                  <div className="pt-2">
                     <p className="text-[10px] font-mono-kasa uppercase tracking-wider text-foreground/40 mb-2">URL Direta (Opcional)</p>
                     <Input 
                        value={form[asset.key] as string || ""} 
                        onChange={(e) => set(asset.key, e.target.value)}
                        placeholder="https://..."
                        className="h-9 text-xs font-mono"
                        disabled={!canEdit}
                     />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}