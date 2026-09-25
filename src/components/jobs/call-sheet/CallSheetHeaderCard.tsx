import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Navigation, Phone, User, Car, ShieldAlert, Sparkles } from "lucide-react";
import type { CallSheetData } from "@/types/call-sheet";

interface Props {
  data: CallSheetData;
  onChange: (patch: Partial<CallSheetData>) => void;
}

export function CallSheetHeaderCard({ data, onChange }: Props) {
  const address = data.location_address || "";
  const encodedAddress = encodeURIComponent(address);
  const mapsUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodedAddress}` : null;
  const wazeUrl = address ? `https://waze.com/ul?q=${encodedAddress}&navigate=yes` : null;

  return (
    <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm space-y-5">
      {/* Linha 1: Datas e Horários Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Calendar className="size-3.5 text-primary" /> Data da Gravação
          </Label>
          <Input
            type="date"
            value={data.shoot_date || ""}
            onChange={(e) => onChange({ shoot_date: e.target.value })}
            className="h-9 text-xs bg-muted/20 border-border/60"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Clock className="size-3.5 text-amber-600" /> Chamada Geral (Call Time)
          </Label>
          <Input
            type="time"
            value={data.general_call_time || ""}
            onChange={(e) => onChange({ general_call_time: e.target.value })}
            className="h-9 text-xs bg-muted/20 border-border/60"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-emerald-600" /> Início de Set (On Set)
          </Label>
          <Input
            type="time"
            value={data.on_set_call_time || ""}
            onChange={(e) => onChange({ on_set_call_time: e.target.value })}
            className="h-9 text-xs bg-muted/20 border-border/60"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Clock className="size-3.5 text-purple-600" /> Previsão de Término (Wrap)
          </Label>
          <Input
            type="time"
            value={data.estimated_wrap || ""}
            onChange={(e) => onChange({ estimated_wrap: e.target.value })}
            className="h-9 text-xs bg-muted/20 border-border/60"
          />
        </div>
      </div>

      {/* Linha 2: Local e Endereço */}
      <div className="pt-2 border-t border-border/40 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4 space-y-1.5">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <MapPin className="size-3.5 text-red-500" /> Nome da Locação / Estúdio
            </Label>
            <Input
              placeholder="Ex: Estúdio Kasa Hub, Casa de Campo, etc."
              value={data.location_name || ""}
              onChange={(e) => onChange({ location_name: e.target.value })}
              className="h-9 text-xs bg-muted/20 border-border/60"
            />
          </div>

          <div className="md:col-span-5 space-y-1.5">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Navigation className="size-3.5 text-sky-500" /> Endereço Completo
            </Label>
            <Input
              placeholder="Rua, número, bairro, cidade - Estado"
              value={data.location_address || ""}
              onChange={(e) => onChange({ location_address: e.target.value })}
              className="h-9 text-xs bg-muted/20 border-border/60"
            />
          </div>

          <div className="md:col-span-3 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!mapsUrl}
              onClick={() => mapsUrl && window.open(mapsUrl, "_blank")}
              className="h-9 flex-1 text-[11px] font-mono-kasa bg-muted/10 hover:bg-red-500/10 hover:text-red-600 hover:border-red-300 transition-colors"
            >
              <MapPin className="size-3 mr-1 text-red-500" /> Maps
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!wazeUrl}
              onClick={() => wazeUrl && window.open(wazeUrl, "_blank")}
              className="h-9 flex-1 text-[11px] font-mono-kasa bg-muted/10 hover:bg-sky-500/10 hover:text-sky-600 hover:border-sky-300 transition-colors"
            >
              <Navigation className="size-3 mr-1 text-sky-500" /> Waze
            </Button>
          </div>
        </div>

        {/* Linha 3: Detalhes de Acesso, Estacionamento e Contato no Local */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Car className="size-3 text-muted-foreground" /> Estacionamento & Carga
            </Label>
            <Input
              placeholder="Ex: Vagas livres no local, portão lateral"
              value={data.location_parking_info || ""}
              onChange={(e) => onChange({ location_parking_info: e.target.value })}
              className="h-8 text-xs bg-muted/20 border-border/60"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <ShieldAlert className="size-3 text-muted-foreground" /> Portaria & Acesso
            </Label>
            <Input
              placeholder="Ex: Portaria exige lista com RG"
              value={data.location_access_notes || ""}
              onChange={(e) => onChange({ location_access_notes: e.target.value })}
              className="h-8 text-xs bg-muted/20 border-border/60"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Phone className="size-3 text-muted-foreground" /> Contato no Local
            </Label>
            <div className="grid grid-cols-2 gap-1.5">
              <Input
                placeholder="Nome"
                value={data.contact_on_site?.name || ""}
                onChange={(e) =>
                  onChange({
                    contact_on_site: {
                      name: e.target.value,
                      phone: data.contact_on_site?.phone || "",
                    },
                  })
                }
                className="h-8 text-xs bg-muted/20 border-border/60"
              />
              <Input
                placeholder="Telefone"
                value={data.contact_on_site?.phone || ""}
                onChange={(e) =>
                  onChange({
                    contact_on_site: {
                      name: data.contact_on_site?.name || "",
                      phone: e.target.value,
                    },
                  })
                }
                className="h-8 text-xs bg-muted/20 border-border/60"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
