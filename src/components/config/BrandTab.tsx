import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AgencySettings } from "@/lib/settings-api";
import { ProfileImageUpload } from "@/components/profile/ProfileImageUpload";

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

export function BrandTab({ form, set, canEdit }: { form: Partial<AgencySettings>, set: any, canEdit: boolean }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-surface p-6">
        <h3 className="text-sm font-semibold mb-6 flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-primary" />
          Logotipo e Cores
        </h3>

        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/3 space-y-4">
            <Label className="text-[10px] font-mono-kasa capitalize text-foreground/60 font-semibold">Logo da Agência (HUB)</Label>
            <ProfileImageUpload
              value={form.logo_url}
              onChange={(url) => set("logo_url", url)}
              label="Logo HUB"
            />
            <p className="text-[10px] text-foreground/40 text-center">
              Aparece na barra lateral, propostas e DMEs.
            </p>
          </div>

          <div className="flex-1 space-y-4">
            <Grid>
              <Field label="Cor primária">
                <div className="flex gap-2">
                  <Input type="color" value={form.brand_primary ?? "#FFBC45"} onChange={(e) => set("brand_primary", e.target.value)} disabled={!canEdit} className="w-16 p-1 h-10 cursor-pointer" />
                  <Input value={form.brand_primary ?? ""} onChange={(e) => set("brand_primary", e.target.value)} disabled={!canEdit} />
                </div>
              </Field>
              <Field label="Cor secundária">
                <div className="flex gap-2">
                  <Input type="color" value={form.brand_secondary ?? "#000000"} onChange={(e) => set("brand_secondary", e.target.value)} disabled={!canEdit} className="w-16 p-1 h-10 cursor-pointer" />
                  <Input value={form.brand_secondary ?? ""} onChange={(e) => set("brand_secondary", e.target.value)} disabled={!canEdit} />
                </div>
              </Field>
            </Grid>
            
            <Field label="Banner da Agência (URL)">
              <Input 
                value={form.banner_url ?? ""} 
                onChange={(e) => set("banner_url", e.target.value)} 
                disabled={!canEdit} 
                placeholder="https://..."
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <h3 className="text-sm font-semibold mb-6 flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-primary" />
          Visualização em Documentos
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-lg bg-background/40 border border-border space-y-4">
            <p className="text-[10px] font-mono-kasa uppercase tracking-widest text-foreground/40">Cabeçalho de Proposta</p>
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-lg bg-white flex items-center justify-center border border-border p-2">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Logo" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-[8px] text-foreground/20 italic">Sem logo</span>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="h-2 w-24 bg-foreground/10 rounded" />
                <div className="h-1.5 w-16 bg-foreground/5 rounded" />
              </div>
            </div>
          </div>

          <div className="p-6 rounded-lg bg-background/40 border border-border space-y-4">
            <p className="text-[10px] font-mono-kasa uppercase tracking-widest text-foreground/40">Banner de Aprovação (DME)</p>
            <div 
              className="h-16 rounded-lg border border-border flex items-center justify-center"
              style={{ background: `${form.brand_primary ?? "#FFBC45"}10` }}
            >
              {form.logo_url ? (
                <img src={form.logo_url} alt="Logo" className="h-8 object-contain" />
              ) : (
                <div className="size-4 border-2 rotate-45" style={{ borderColor: form.brand_primary ?? "#FFBC45" }} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
