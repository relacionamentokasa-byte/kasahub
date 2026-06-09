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
    setValidating(key);
    set(key as any, url);
    
    // Simula validação
    setTimeout(() => {
      setValidating(null);
    }, 1500);

    // Se subir uma das logos principais, pode atualizar as antigas como fallback se estiverem vazias
    if (key === 'logo_white_url') {
      if (!form.logo_url) set('logo_url', url);
      if (!form.logo_sidebar_url) set('logo_sidebar_url', url);
      if (!form.logo_login_url) set('logo_login_url', url);
    }
    
    // Dispara evento global para atualizar as logos em tempo real
    window.dispatchEvent(new CustomEvent('brand-settings-updated'));
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
          Preview em Tempo Real
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-5 rounded-xl bg-[#0c1618] border border-white/5 space-y-4">
            <p className="text-[10px] font-mono-kasa uppercase tracking-widest text-white/40">Menu Lateral</p>
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-lg">
              <div className="h-10 w-auto flex items-center justify-center">
                {form.logo_sidebar_url || form.logo_white_url ? (
                  <img src={(form.logo_sidebar_url || form.logo_white_url) as string} alt="Logo Sidebar" className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="size-6 border-2 border-white/20 rotate-45" />
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="h-1.5 w-16 bg-white/10 rounded" />
                <div className="h-1.5 w-12 bg-white/5 rounded" />
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-[#0c1618] border border-white/5 space-y-4">
            <p className="text-[10px] font-mono-kasa uppercase tracking-widest text-white/40">Tela de Login</p>
            <div className="flex flex-col items-center gap-3 bg-white/5 p-4 rounded-lg">
              <div className="h-12 w-auto flex items-center justify-center">
                {form.logo_white_url ? (
                  <img src={form.logo_white_url as string} alt="Logo Branca" className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="size-6 border-2 border-white/20 rotate-45" />
                )}
              </div>
              <div className="w-full space-y-1.5 pt-2">
                <div className="h-2 w-full bg-white/10 rounded" />
                <div className="h-2 w-full bg-white/10 rounded" />
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white border border-black/5 space-y-4">
            <p className="text-[10px] font-mono-kasa uppercase tracking-widest text-black/40">Relatórios</p>
            <div className="bg-black/5 p-4 rounded-lg">
              <div className="h-8 w-auto flex items-center justify-center mb-3">
                {form.logo_black_url ? (
                  <img src={form.logo_black_url as string} alt="Logo Preta" className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="size-6 border-2 border-black/20 rotate-45" />
                )}
              </div>
              <div className="space-y-1">
                <div className="h-1 w-full bg-black/10 rounded" />
                <div className="h-1 w-full bg-black/10 rounded" />
                <div className="h-1 w-2/3 bg-black/10 rounded" />
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-muted/10 border border-border space-y-4">
            <p className="text-[10px] font-mono-kasa uppercase tracking-widest text-foreground/40">Splash / Loading</p>
            <div className="flex flex-col items-center justify-center gap-4 aspect-video bg-background p-4 rounded-lg border border-border/50 shadow-inner">
              <div className="animate-bounce">
                {form.logo_yellow_url ? (
                  <img src={form.logo_yellow_url as string} alt="Logo Amarela" className="size-12 object-contain" />
                ) : (
                  <div className="size-8 border-2 border-primary rotate-45" />
                )}
              </div>
              <div className="w-24 h-1 bg-muted rounded-full overflow-hidden">
                <div className="w-1/2 h-full bg-primary animate-[shimmer_2s_infinite]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}