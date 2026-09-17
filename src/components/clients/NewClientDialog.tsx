import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { createClient } from "@/lib/ops-api";
import { fetchServices } from "@/lib/services-api";
import { addClientService } from "@/lib/client-services-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { toast } from "sonner";
import { Lock, Building2, UserCheck, Loader2 } from "lucide-react";
import { CLIENT_SEGMENTS } from "@/lib/client-segments";

export function NewClientDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: (id: string) => void;
}) {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("clients-realtime-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients" },
        () => qc.invalidateQueries({ queryKey: ["clients"] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    document: "",
    website: "",
    address: "",
    address_number: "",
    neighborhood: "",
    city: "",
    state: "",
    zip_code: "",
    commercial_contact_name: "",
    commercial_contact_phone: "",
    commercial_contact_email: "",
    financial_contact_name: "",
    financial_contact_phone: "",
    financial_contact_email: "",
    notes: "",
    logo_url: "" as string | null,
    brand_primary: "#FFBC45",
    status: "active",
    contract_type: "recurring",
    contract_value: 0,
    start_date: "",
    segment: "",
  });
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const { data: _services = [] } = useQuery({
    queryKey: ["services", "active"],
    queryFn: () => fetchServices({ onlyActive: true }),
    enabled: open,
  });

  const reset = () => {
    setForm({
      name: "",
      company: "",
      email: "",
      phone: "",
      document: "",
      website: "",
      address: "",
      address_number: "",
      neighborhood: "",
      city: "",
      state: "",
      zip_code: "",
      commercial_contact_name: "",
      commercial_contact_phone: "",
      commercial_contact_email: "",
      financial_contact_name: "",
      financial_contact_phone: "",
      financial_contact_email: "",
      notes: "",
      logo_url: "",
      brand_primary: "#FFBC45",
      status: "active",
      contract_type: "recurring",
      contract_value: 0,
      start_date: "",
      segment: "",
    });
    setSelectedServices([]);
  };

  const mut = useMutation({
    mutationFn: async () => {
      const c = await createClient({
        ...form,
        name: form.name || form.company || "Cliente sem nome",
        logo_url: form.logo_url || null,
        start_date: form.start_date || null,
      });
      for (const sid of selectedServices) {
        try {
          await addClientService({
            client_id: c.id,
            service_id: sid,
            contract_type: form.contract_type as "recurring" | "one_time",
            start_date: form.start_date || undefined,
          });
        } catch (e) {
          console.error("Failed to link service", sid, e);
        }
      }
      return c;
    },
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client-services", c.id] });
      toast.success(
        selectedServices.length
          ? `Cliente cadastrado com ${selectedServices.length} serviço(s)`
          : "Cliente cadastrado com sucesso!"
      );
      onOpenChange(false);
      reset();
      onCreated?.(c.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight">
            <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Building2 className="size-5" />
            </div>
            <span>Novo Cliente</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Cadastre um novo cliente com dados cadastrais, contatos e preferências.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="dados" className="w-full pt-1">
          <TabsList className="grid grid-cols-2 w-full h-9 bg-muted/50 p-1">
            <TabsTrigger value="dados" className="text-xs font-medium">
              Dados Cadastrais
            </TabsTrigger>
            <TabsTrigger value="portal" className="text-xs font-medium">
              Portal do Cliente
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="mt-4 space-y-4">
            <div className="flex flex-col items-center gap-2 py-1">
              <ImageUpload
                value={form.logo_url}
                onChange={(url) => setForm({ ...form, logo_url: url })}
                folder="clients"
                label="Logo / Foto"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Nome Fantasia *
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nome fantasia do cliente"
                className="h-9 text-xs font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                  Razão Social
                </Label>
                <Input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                  Status
                </Label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="active">Ativo</option>
                  <option value="paused">Pausado</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                  CNPJ / CPF
                </Label>
                <Input
                  value={form.document}
                  onChange={(e) => setForm({ ...form, document: e.target.value })}
                  placeholder="00.000.000/0001-00"
                  className="h-9 text-xs font-mono-kasa tabular-nums"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                  Segmento
                </Label>
                <select
                  value={form.segment}
                  onChange={(e) => setForm({ ...form, segment: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="">— Não definido —</option>
                  {CLIENT_SEGMENTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                  E-mail Principal
                </Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@cliente.com"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                  Telefone Principal
                </Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="h-9 text-xs font-mono-kasa tabular-nums"
                />
              </div>
            </div>

            {/* Endereço */}
            <div className="pt-3 border-t border-border/60">
              <h4 className="text-[10px] font-mono-kasa uppercase tracking-wider text-foreground/60 font-semibold mb-2.5">
                Endereço
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-2.5">
                <div className="space-y-1 sm:col-span-4">
                  <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground">Logradouro</Label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Rua / Avenida"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground">Número</Label>
                  <Input
                    value={form.address_number}
                    onChange={(e) => setForm({ ...form, address_number: e.target.value })}
                    placeholder="123"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1 sm:col-span-3">
                  <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground">Bairro</Label>
                  <Input
                    value={form.neighborhood}
                    onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1 sm:col-span-3">
                  <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground">CEP</Label>
                  <Input
                    value={form.zip_code}
                    onChange={(e) => setForm({ ...form, zip_code: e.target.value })}
                    placeholder="00000-000"
                    className="h-9 text-xs font-mono-kasa tabular-nums"
                  />
                </div>
                <div className="space-y-1 sm:col-span-4">
                  <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground">Cidade</Label>
                  <Input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground">UF</Label>
                  <Input
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
                    placeholder="UF"
                    maxLength={2}
                    className="h-9 text-xs font-mono-kasa uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Contatos Chave */}
            <div className="pt-3 border-t border-border/60">
              <h4 className="text-[10px] font-mono-kasa uppercase tracking-wider text-foreground/60 font-semibold mb-2.5">
                Contatos Comerciais e Financeiros
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <UserCheck className="size-3.5 text-primary" />
                    <span>Responsável Comercial</span>
                  </div>
                  <Input
                    value={form.commercial_contact_name}
                    onChange={(e) => setForm({ ...form, commercial_contact_name: e.target.value })}
                    placeholder="Nome do contato"
                    className="h-8 text-xs"
                  />
                  <Input
                    value={form.commercial_contact_phone}
                    onChange={(e) => setForm({ ...form, commercial_contact_phone: e.target.value })}
                    placeholder="Telefone / WhatsApp"
                    className="h-8 text-xs font-mono-kasa tabular-nums"
                  />
                  <Input
                    type="email"
                    value={form.commercial_contact_email}
                    onChange={(e) => setForm({ ...form, commercial_contact_email: e.target.value })}
                    placeholder="E-mail"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Building2 className="size-3.5 text-primary" />
                    <span>Responsável Financeiro</span>
                  </div>
                  <Input
                    value={form.financial_contact_name}
                    onChange={(e) => setForm({ ...form, financial_contact_name: e.target.value })}
                    placeholder="Nome do contato"
                    className="h-8 text-xs"
                  />
                  <Input
                    value={form.financial_contact_phone}
                    onChange={(e) => setForm({ ...form, financial_contact_phone: e.target.value })}
                    placeholder="Telefone / WhatsApp"
                    className="h-8 text-xs font-mono-kasa tabular-nums"
                  />
                  <Input
                    type="email"
                    value={form.financial_contact_email}
                    onChange={(e) => setForm({ ...form, financial_contact_email: e.target.value })}
                    placeholder="E-mail"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Observações
              </Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Observações internas sobre o cliente…"
                className="text-xs resize-none"
              />
            </div>
          </TabsContent>

          <TabsContent value="portal" className="mt-4">
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-8 text-center">
              <div className="size-12 rounded-2xl bg-muted/50 border border-border/80 flex items-center justify-center mx-auto mb-3 text-muted-foreground">
                <Lock className="size-5" />
              </div>
              <p className="text-sm font-semibold">Configuração pós-cadastro</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Após criar o cliente, você poderá configurar o portal exclusivo, links de aprovação de peças, cores da marca e acessos de usuários.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-9 text-xs"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={() => mut.mutate()}
            disabled={mut.isPending || (!form.name && !form.company)}
            className="h-9 text-xs font-medium gap-1.5"
          >
            {mut.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Building2 className="size-3.5" />}
            Cadastrar Cliente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
