import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { type Partner } from "@/lib/partners-api";
import { PartnerStats } from "./PartnerStats";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MapPin, Globe, CreditCard, Calculator, List } from "lucide-react";
import { CommissionCalculator } from "./CommissionCalculator";
import { CommissionHistory } from "./CommissionHistory";
import { Separator } from "@/components/ui/separator";


interface Props {
  partner: Partner | null;
  onClose: () => void;
}

export function PartnerSheet({ partner, onClose }: Props) {
  if (!partner) return null;

  return (
    <Sheet open={!!partner} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="bg-surface border-border w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-4 mb-2">
            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 overflow-hidden relative">
              {partner.photo_url ? (
                <img src={partner.photo_url} alt={partner.name} className="absolute inset-0 size-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-primary">{partner.name[0]}</span>
              )}
            </div>
            <div>
              <SheetTitle className="font-display text-2xl">{partner.name}</SheetTitle>
              <Badge variant="outline" className="mt-1">
                {typeLabel(partner.type)}
              </Badge>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-8 space-y-8">
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-2">
              <Globe className="size-4" /> Resumo de Indicadores
            </h3>
            <PartnerStats partner={partner} />
          </section>

          {partner.type === 'representative' && (
            <>
              <Separator className="bg-border/50" />
              <section className="space-y-6">
                <CommissionCalculator />
              </section>

              <Separator className="bg-border/50" />
              <section className="space-y-6">
                <CommissionHistory partnerId={partner.id} />
              </section>
            </>
          )}


          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-2">
              <Phone className="size-4" /> Contato e Localização
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoItem label="E-mail" value={partner.email} icon={Mail} />
              <InfoItem label="Telefone" value={partner.phone} icon={Phone} />
              <InfoItem label="WhatsApp" value={partner.whatsapp} icon={Phone} />
              <InfoItem label="Cidade" value={partner.city} icon={MapPin} />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="size-4" /> Financeiro
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoItem label="CPF/CNPJ" value={partner.document} />
              <InfoItem label="Chave PIX" value={partner.pix_key} />
              <div className="col-span-2">
                <InfoItem label="Dados Bancários" value={partner.bank_info} />
              </div>
            </div>
          </section>

          {partner.observations && (
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">
                Observações
              </h3>
              <p className="text-sm text-foreground/60 bg-background p-4 rounded-xl border border-border">
                {partner.observations}
              </p>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoItem({ label, value, icon: Icon }: { label: string, value: string | null, icon?: any }) {
  if (!value) return null;
  return (
    <div className="bg-background border border-border p-3 rounded-lg">
      <p className="text-[10px] uppercase font-mono-kasa text-foreground/40 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="size-3.5 text-primary/60" />}
        <span className="text-sm font-medium">{value}</span>
      </div>
    </div>
  );
}

function typeLabel(type: string) {
  switch (type) {
    case 'representative': return 'Representante';
    case 'freelancer': return 'Freelancer';
    case 'supplier': return 'Fornecedor';
    case 'strategic': return 'Parceiro Estratégico';
    default: return type;
  }
}
