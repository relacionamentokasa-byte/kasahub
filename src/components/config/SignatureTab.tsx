import { Label } from "@/components/ui/label";
import { ProfileImageUpload } from "@/components/profile/ProfileImageUpload";
import type { AgencySettings } from "@/lib/settings-api";

export function SignatureTab({ form, set }: { form: Partial<AgencySettings>, set: any }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="mb-6">
        <h3 className="font-display text-lg font-semibold">Assinatura da Empresa</h3>
        <p className="text-xs text-foreground/50">
          Esta assinatura será exibida automaticamente no Contrato Jurídico das propostas aprovadas.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <Label className="text-[10px] font-mono-kasa capitalize text-foreground/60 font-semibold">Assinatura Digitalizada</Label>
          <ProfileImageUpload
            value={form.agency_signature_url}
            onChange={(url) => set("agency_signature_url", url)}
            label="Assinatura"
            shape="rect"
            aspect={3/1}
            bucket="signatures"
            folder="company"
          />
          <p className="text-[10px] text-foreground/40 text-center">
            Proporção ideal: 3:1 (ex: 300x100px). Aceita PNG transparente ou JPG.
          </p>
        </div>
        {form.agency_signature_url && (
          <div className="space-y-2">
            <Label className="text-[10px] font-mono-kasa capitalize text-foreground/60">Visualização</Label>
            <div className="p-4 rounded-lg bg-white border border-border flex items-center justify-center min-h-[120px]">
              <img src={form.agency_signature_url} alt="Assinatura" className="w-full max-w-[300px] h-[100px] object-contain" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
