import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AgencySettings } from "@/lib/settings-api";

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
    <div className="rounded-xl border border-border bg-surface p-6">
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
    </div>
  );
}
