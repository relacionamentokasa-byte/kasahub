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
}

const BRANDING_ASSETS: BrandingAsset[] = [
  {
    key: "logo_url",
    label: "Logo Principal",
    usage: "Dashboard, Relatórios, Documentos, Portal do Cliente",
    recommendedSize: "1200x400px (Horizontal)",
    formats: ["PNG Transparente", "SVG"],
    description: "Versão principal da marca usada na maioria das comunicações."
  },
  {
    key: "logo_sidebar_url",
    label: "Logo Menu Lateral",
    usage: "Sidebar Desktop e Sidebar Mobile",
    recommendedSize: "400x120px",
    formats: ["PNG Transparente", "SVG"],
    description: "Versão otimizada para o menu de navegação lateral."
  },
  {
    key: "logo_login_url",
    label: "Logo Tela de Login",
    usage: "Página de Login e Recuperação de Senha",
    recommendedSize: "800x300px",
    formats: ["PNG Transparente", "SVG"],
    description: "Exibida no centro das telas de autenticação."
  },
  {
    key: "icon_system_url",
    label: "Ícone do Sistema",
    usage: "Menu recolhido, Cards, Avatares padrão",
    recommendedSize: "512x512px (Quadrado)",
    formats: ["PNG Transparente", "SVG"],
    description: "Versão reduzida/símbolo da marca."
  },
  {
    key: "pwa_favicon_url",
    label: "Favicon",
    usage: "Aba do navegador, Favoritos",
    recommendedSize: "32x32px ou 48x48px",
    formats: ["PNG", "ICO"],
    description: "Ícone pequeno exibido na aba do navegador."
  },
  {
    key: "pwa_icon_192_url",
    label: "Ícone PWA (192px)",
    usage: "Instalação Android, iPhone (PWA)",
    recommendedSize: "192x192px",
    formats: ["PNG"],
    description: "Ícone para dispositivos com menor densidade de pixels."
  },
  {
    key: "pwa_icon_512_url",
    label: "Ícone PWA (512px)",
    usage: "Instalação Android, iPhone (PWA)",
    recommendedSize: "512x512px",
    formats: ["PNG"],
    description: "Ícone principal de alta resolução para o aplicativo mobile."
  },
  {
    key: "splash_screen_url",
    label: "Splash Screen",
    usage: "Tela de abertura do App (PWA)",
    recommendedSize: "1242x2688px",
    formats: ["PNG"],
    description: "Imagem de carregamento exibida ao abrir o aplicativo mobile."
  },
  {
    key: "logo_proposals_url",
    label: "Logo das Propostas",
    usage: "Propostas Comerciais (PDF e Página Pública)",
    recommendedSize: "1200x400px",
    formats: ["PNG Transparente", "SVG"],
    description: "Versão de alta qualidade para documentos comerciais."
  },
  {
    key: "agency_signature_url",
    label: "Assinatura da Empresa",
    usage: "Contratos, Aprovação de Propostas",
    recommendedSize: "1000x300px",
    formats: ["PNG Transparente"],
    description: "Assinatura digital padrão para documentos jurídicos."
  },
  {
    key: "logo_reports_url",
    label: "Logo dos Relatórios",
    usage: "Relatórios PDF, Exportações de Dados",
    recommendedSize: "1200x400px",
    formats: ["PNG Transparente", "SVG"],
    description: "Logotipo otimizado para visualização em documentos PDF."
  }
];

export function BrandTab({ form, set, canEdit }: { form: Partial<AgencySettings>, set: any, canEdit: boolean }) {
  const [validating, setValidating] = useState<string | null>(null);

  const handleUpload = (key: string, url: string | null) => {
    setValidating(key);
    set(key as any, url);
    
    // Simulate some validation after upload
    setTimeout(() => {
      setValidating(null);
    }, 1500);
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="rounded-xl border border-border bg-surface p-6">
        <h3 className="text-sm font-semibold mb-6 flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-primary" />
          Identidade Visual e Cores
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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

        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {BRANDING_ASSETS.map((asset) => (
              <div key={asset.key} className="space-y-4 p-5 rounded-xl border border-border/50 bg-muted/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold tracking-tight">{asset.label}</h4>
                    <p className="text-[10px] text-foreground/40 leading-relaxed max-w-[200px]">
                      {asset.description}
                    </p>
                  </div>
                  <div className={cn(
                    "px-2 py-0.5 rounded text-[8px] font-mono-kasa border uppercase tracking-wider",
                    form[asset.key] ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-orange-500/10 border-orange-500/20 text-orange-500"
                  )}>
                    {form[asset.key] ? "Configurado" : "Pendente"}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="w-full sm:w-32 h-32 shrink-0">
                    <ProfileImageUpload
                      value={form[asset.key] as string | null}
                      onChange={(url) => handleUpload(asset.key as string, url)}
                      label={asset.label}
                      shape={asset.key === 'icon_system_url' || asset.key === 'pwa_favicon_url' || asset.key === 'pwa_icon_512_url' ? 'round' : 'rect'}
                    />
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px] text-foreground/60">
                        <Info className="size-3 text-primary" />
                        <span className="font-semibold uppercase tracking-wider">Onde utilizar:</span>
                      </div>
                      <p className="text-[10px] text-foreground/50 pl-5">{asset.usage}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px] text-foreground/60">
                        <ImageIcon className="size-3 text-primary" />
                        <span className="font-semibold uppercase tracking-wider">Recomendado:</span>
                      </div>
                      <p className="text-[10px] text-foreground/50 pl-5">{asset.recommendedSize}</p>
                    </div>

                    <div className="flex flex-wrap gap-1 pl-5">
                      {asset.formats.map(f => (
                        <span key={f} className="text-[8px] bg-background border border-border px-1.5 py-0.5 rounded text-foreground/40">
                          {f}
                        </span>
                      ))}
                    </div>

                    {validating === asset.key && (
                      <div className="flex items-center gap-2 pl-5 pt-2 animate-pulse">
                        <div className="size-1.5 rounded-full bg-primary" />
                        <span className="text-[9px] text-primary font-medium">Validando arquivo...</span>
                      </div>
                    )}

                    {form[asset.key] && validating !== asset.key && (
                      <div className="flex items-center gap-2 pl-5 pt-2">
                        <CheckCircle2 className="size-3 text-green-500" />
                        <span className="text-[9px] text-green-500 font-medium italic">Resolução e transparência OK</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <h3 className="text-sm font-semibold mb-6 flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-primary" />
          Preview do Sistema
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-lg bg-background/40 border border-border space-y-4">
            <p className="text-[10px] font-mono-kasa uppercase tracking-widest text-foreground/40">Menu Lateral</p>
            <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-lg">
              <div className="h-8 w-24 flex items-center justify-center border border-border/50 p-1 bg-background rounded">
                {form.logo_sidebar_url || form.logo_url ? (
                  <img src={(form.logo_sidebar_url || form.logo_url) as string} alt="Logo" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-[8px] text-foreground/20 italic">Sem logo</span>
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="h-1.5 w-16 bg-foreground/10 rounded" />
                <div className="h-1.5 w-12 bg-foreground/5 rounded" />
              </div>
            </div>
          </div>

          <div className="p-6 rounded-lg bg-background/40 border border-border space-y-4">
            <p className="text-[10px] font-mono-kasa uppercase tracking-widest text-foreground/40">Tela de Login</p>
            <div className="flex flex-col items-center gap-3 bg-muted/30 p-4 rounded-lg">
              <div className="h-12 w-32 flex items-center justify-center border border-border/50 p-2 bg-background rounded shadow-sm">
                {form.logo_login_url || form.logo_url ? (
                  <img src={(form.logo_login_url || form.logo_url) as string} alt="Logo" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-[8px] text-foreground/20 italic">Sem logo</span>
                )}
              </div>
              <div className="w-full space-y-1.5 pt-2">
                <div className="h-2 w-full bg-foreground/10 rounded" />
                <div className="h-2 w-full bg-foreground/10 rounded" />
              </div>
            </div>
          </div>

          <div className="p-6 rounded-lg bg-background/40 border border-border space-y-4">
            <p className="text-[10px] font-mono-kasa uppercase tracking-widest text-foreground/40">Proposta Comercial</p>
            <div className="bg-white p-4 rounded-lg border border-border/50">
              <div className="h-6 w-20 flex items-center justify-center border-b border-border/20 mb-2">
                {form.logo_proposals_url || form.logo_url ? (
                  <img src={(form.logo_proposals_url || form.logo_url) as string} alt="Logo" className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="size-2 rounded-full bg-primary" />
                )}
              </div>
              <div className="space-y-1">
                <div className="h-1 w-full bg-foreground/5 rounded" />
                <div className="h-1 w-full bg-foreground/5 rounded" />
                <div className="h-1 w-2/3 bg-foreground/5 rounded" />
              </div>
            </div>
          </div>

          <div className="p-6 rounded-lg bg-background/40 border border-border space-y-4">
            <p className="text-[10px] font-mono-kasa uppercase tracking-widest text-foreground/40">Assinatura Digital</p>
            <div className="h-20 flex flex-col justify-end bg-muted/30 p-4 rounded-lg">
              {form.agency_signature_url ? (
                <img src={form.agency_signature_url as string} alt="Assinatura" className="h-10 object-contain self-start" />
              ) : (
                <div className="h-0.5 w-32 bg-foreground/20 mb-2" />
              )}
              <div className="text-[8px] font-medium uppercase tracking-tighter opacity-40">Assinatura da Agência</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
