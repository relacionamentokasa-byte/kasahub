import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { createClient } from "@/lib/ops-api";
import { fetchServices } from "@/lib/services-api";
import { addClientService } from "@/lib/client-services-api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUpload } from "@/components/ui/image-upload";
import { toast } from "sonner";
import { Lock, Package } from "lucide-react";
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
      .channel('clients-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clients' },
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

  const { data: services = [] } = useQuery({
    queryKey: ["services", "active"],
    queryFn: () => fetchServices({ onlyActive: true }),
    enabled: open,
  });

  const reset = () => {
    setForm({
      name: "", company: "", email: "", phone: "", document: "", website: "", address: "",
      address_number: "", neighborhood: "", city: "", state: "", zip_code: "",
      commercial_contact_name: "", commercial_contact_phone: "", commercial_contact_email: "",
      financial_contact_name: "", financial_contact_phone: "", financial_contact_email: "",
      notes: "", logo_url: "", brand_primary: "#FFBC45", status: "active",
      contract_type: "recurring", contract_value: 0, start_date: "", segment: "",
    });
    setSelectedServices([]);
  };

  const toggleService = (id: string) =>
    setSelectedServices((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

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
          : "Cliente cadastrado",
      );
      onOpenChange(false);
      reset();
      onCreated?.(c.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Novo cliente</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="dados" className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="portal">Portal</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="mt-4 space-y-4">
            <div className="flex flex-col items-center gap-2 py-2">
              <ImageUpload
                value={form.logo_url}
                onChange={(url) => setForm({ ...form, logo_url: url })}
                folder="clients"
                label="Foto"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Nome Fantasia *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nome fantasia do cliente"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Razão Social</Label>
                <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="active">Ativo</option>
                  <option value="paused">Pausado</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>CNPJ / CPF</Label>
                <Input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} placeholder="00.000.000/0001-00" />
              </div>
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" />
              </div>
              <div className="space-y-1.5">
                <Label>Segmento</Label>
                <select
                  value={form.segment}
                  onChange={(e) => setForm({ ...form, segment: e.target.value })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">— Não definido —</option>
                  {CLIENT_SEGMENTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@cliente.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" />
              </div>
            </div>

            <div className="pt-2 border-t border-border/50">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-2">Endereço</h4>
              <div className="grid grid-cols-6 gap-3">
                <div className="space-y-1.5 col-span-4">
                  <Label>Endereço</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Rua / Avenida" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Número</Label>
                  <Input value={form.address_number} onChange={(e) => setForm({ ...form, address_number: e.target.value })} placeholder="123" />
                </div>
                <div className="space-y-1.5 col-span-3">
                  <Label>Bairro</Label>
                  <Input value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} />
                </div>
                <div className="space-y-1.5 col-span-3">
                  <Label>CEP</Label>
                  <Input value={form.zip_code} onChange={(e) => setForm({ ...form, zip_code: e.target.value })} placeholder="00000-000" />
                </div>
                <div className="space-y-1.5 col-span-4">
                  <Label>Cidade</Label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Estado</Label>
                  <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} placeholder="UF" maxLength={2} />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border/50">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-2">Responsável Comercial</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label>Nome</Label>
                  <Input value={form.commercial_contact_name} onChange={(e) => setForm({ ...form, commercial_contact_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefone</Label>
                  <Input value={form.commercial_contact_phone} onChange={(e) => setForm({ ...form, commercial_contact_phone: e.target.value })} placeholder="(11) 99999-9999" />
                </div>
                <div className="space-y-1.5">
                  <Label>E-mail</Label>
                  <Input type="email" value={form.commercial_contact_email} onChange={(e) => setForm({ ...form, commercial_contact_email: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border/50">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-2">Responsável Financeiro</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label>Nome</Label>
                  <Input value={form.financial_contact_name} onChange={(e) => setForm({ ...form, financial_contact_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefone</Label>
                  <Input value={form.financial_contact_phone} onChange={(e) => setForm({ ...form, financial_contact_phone: e.target.value })} placeholder="(11) 99999-9999" />
                </div>
                <div className="space-y-1.5">
                  <Label>E-mail</Label>
                  <Input type="email" value={form.financial_contact_email} onChange={(e) => setForm({ ...form, financial_contact_email: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-border/50">
              <Label>Cor da marca</Label>
              <div className="flex gap-2">
                <Input type="color" value={form.brand_primary} onChange={(e) => setForm({ ...form, brand_primary: e.target.value })} className="w-12 p-1 h-10" />
                <Input value={form.brand_primary} onChange={(e) => setForm({ ...form, brand_primary: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Observações sobre o cliente…"
              />
            </div>
          </TabsContent>

          <TabsContent value="portal" className="mt-4">
            <div className="rounded-xl border border-dashed border-border bg-background/40 p-8 text-center">
              <Lock className="size-8 mx-auto text-foreground/30 mb-3" />
              <p className="text-sm font-medium">Disponível após cadastro</p>
              <p className="text-xs text-foreground/50 mt-1 max-w-sm mx-auto">
                Cadastre o cliente primeiro para configurar o portal, banner, cores e usuários.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || (!form.name && !form.company)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Cadastrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
