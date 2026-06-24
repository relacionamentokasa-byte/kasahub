import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export function IdentityTab({ form, set, canEdit }: { form: Partial<AgencySettings>, set: any, canEdit: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <Grid>
        <Field label="Nome do Sistema (HUB)">
          <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} disabled={!canEdit} placeholder="Ex: KASA HUB" />
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
      <Field label="Rodapé do PDF de Demandas Extras" className="mt-4">
        <Textarea
          value={form.dme_pdf_footer ?? ""}
          onChange={(e) => set("dme_pdf_footer", e.target.value)}
          disabled={!canEdit}
          rows={3}
          placeholder="Ex: Obrigado pela parceria! Dúvidas: contato@suaempresa.com · (11) 99999-0000"
        />
      </Field>
    </div>
  );
}
