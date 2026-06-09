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
  },
  {
    key: "logo_sidebar_url",
    label: "Logo Menu Lateral",
    usage: "Exibida no topo do menu lateral — use a versão branca ou amarela",
    recommendedSize: "120x120px (Quadrado)",
    formats: ["PNG Transparente", "SVG"],
    description: "Versão específica para o menu lateral. Idealmente com fundo transparente.",
    aspect: 1,
    previewBg: "dark"
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
          <div className="p-8 border border-dashed border-border rounded-xl text-center bg-muted/5">
            <Info className="size-8 text-primary mx-auto mb-3 opacity-50" />
            <h4 className="text-base font-semibold mb-1">Identidade Visual Fixa</h4>
            <p className="text-sm text-foreground/50 max-w-md mx-auto">
              As logos do sistema estão configuradas com arquivos fixos para garantir a consistência visual. 
              A alteração via painel está temporariamente desabilitada.
            </p>
          </div>
        </div>
      </div>


      <div className="rounded-xl border border-border bg-surface p-6">
        <h3 className="text-sm font-semibold mb-6 flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-primary" />
          Preview Logos Atuais (Fixas)
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-5 rounded-xl bg-[#0c1618] border border-white/5 space-y-4">
            <p className="text-[10px] font-mono-kasa uppercase tracking-widest text-white/40">Menu Lateral / Login</p>
            <div className="flex items-center justify-center bg-white/5 p-8 rounded-lg min-h-[120px]">
              <img src="https://fduofhsiahyxvlaxthhe.supabase.co/storage/v1/object/public/logos/logo-white.png" alt="Logo Branca" className="max-h-16 w-auto object-contain" />
            </div>
          </div>

          <div className="p-5 rounded-xl bg-muted/10 border border-border space-y-4">
            <p className="text-[10px] font-mono-kasa uppercase tracking-widest text-foreground/40">Splash / Loading / Favicon</p>
            <div className="flex flex-col items-center justify-center gap-4 bg-background p-8 rounded-lg border border-border/50 shadow-inner min-h-[120px]">
              <img src="https://fduofhsiahyxvlaxthhe.supabase.co/storage/v1/object/public/logos/logo-yellow.png" alt="Logo Amarela" className="size-16 object-contain" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}