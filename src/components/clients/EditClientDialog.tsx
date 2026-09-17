import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { updateClient, type Client } from "@/lib/ops-api";
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
import { Trash2, Copy, ExternalLink, Building2, UserCheck, Loader2 } from "lucide-react";
import { CLIENT_SEGMENTS } from "@/lib/client-segments";
import { DeleteClientDialog } from "./DeleteClientDialog";

export function EditClientDialog({
  client,
  open,
  onOpenChange,
}: {
  client: Client;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [form, setForm] = useState({
    name: client.name || "",
    company: client.company || "",
    email: client.email || "",
    phone: client.phone || "",
    document: client.document || "",
    website: client.website || "",
    address: client.address || "",
    address_number: client.address_number || "",
    neighborhood: client.neighborhood || "",
    city: client.city || "",
    state: client.state || "",
    zip_code: client.zip_code || "",
    commercial_contact_name: client.commercial_contact_name || "",
    commercial_contact_phone: client.commercial_contact_phone || "",
    commercial_contact_email: client.commercial_contact_email || "",
    financial_contact_name: client.financial_contact_name || "",
    financial_contact_phone: client.financial_contact_phone || "",
    financial_contact_email: client.financial_contact_email || "",
    notes: client.notes || "",
    logo_url: client.logo_url || null,
    brand_primary: client.brand_primary || "#FFBC45",
    status: client.status || "active",
    contract_type: client.contract_type || "recurring",
    contract_value: client.contract_value || 0,
    start_date: client.start_date || "",
    segment: client.segment || "",
    portal_slug: client.portal_slug || "",
    portal_cover_url: client.portal_cover_url || null,
    portal_primary_color: client.portal_primary_color || null,
    portal_cover_color: client.portal_cover_color || null,
    portal_text_color: client.portal_text_color || null,
    has_launch_grid: !!(client as any).has_launch_grid,
    has_editorial_calendar: !!(client as any).has_editorial_calendar,
  });

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name || "",
        company: client.company || "",
        email: client.email || "",
        phone: client.phone || "",
        document: client.document || "",
        website: client.website || "",
        address: client.address || "",
        address_number: client.address_number || "",
        neighborhood: client.neighborhood || "",
        city: client.city || "",
        state: client.state || "",
        zip_code: client.zip_code || "",
        commercial_contact_name: client.commercial_contact_name || "",
        commercial_contact_phone: client.commercial_contact_phone || "",
        commercial_contact_email: client.commercial_contact_email || "",
        financial_contact_name: client.financial_contact_name || "",
        financial_contact_phone: client.financial_contact_phone || "",
        financial_contact_email: client.financial_contact_email || "",
        notes: client.notes || "",
        logo_url: client.logo_url || null,
        brand_primary: client.brand_primary || "#FFBC45",
        status: client.status || "active",
        contract_type: client.contract_type || "recurring",
        contract_value: client.contract_value || 0,
        start_date: client.start_date || "",
        segment: client.segment || "",
        portal_slug: client.portal_slug || "",
        portal_cover_url: client.portal_cover_url || null,
        portal_primary_color: client.portal_primary_color || null,
        portal_cover_color: client.portal_cover_color || null,
        portal_text_color: client.portal_text_color || null,
        has_launch_grid: !!(client as any).has_launch_grid,
        has_editorial_calendar: !!(client as any).has_editorial_calendar,
      });
    }
  }, [client]);

  const mut = useMutation({
    mutationFn: () =>
      updateClient(client.id, {
        ...form,
        name: form.name || form.company || "Cliente sem nome",
        logo_url: form.logo_url || null,
        start_date: form.start_date || null,
        portal_slug: (form.portal_slug || "").trim() || null,
        portal_cover_url: form.portal_cover_url || null,
        portal_primary_color: form.portal_primary_color || null,
        portal_cover_color: form.portal_cover_color || null,
        portal_text_color: form.portal_text_color || null,
      } as any),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", client.id] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente atualizado com sucesso!");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight">
            <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Building2 className="size-5" />
            </div>
            <span>Editar Cliente · {client.name || client.company}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Atualize dados de faturamento, canais de atendimento e portal exclusivo.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="dados" className="w-full pt-1">
          <TabsList className="grid grid-cols-2 w-full h-9 bg-muted/50 p-1">
            <TabsTrigger value="dados" className="text-xs font-medium">Dados Cadastrais</TabsTrigger>
            <TabsTrigger value="portal" className="text-xs font-medium">Portal do Cliente</TabsTrigger>
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

            {/* Módulos */}
            <div className="pt-3 border-t border-border/60 space-y-2">
              <h4 className="text-[10px] font-mono-kasa uppercase tracking-wider text-foreground/60 font-semibold">
                Módulos Ativos no Cliente
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-border/70 hover:bg-muted/20 cursor-pointer transition-colors bg-background/40">
                  <input
                    type="checkbox"
                    checked={!!form.has_launch_grid}
                    onChange={(e) => setForm({ ...form, has_launch_grid: e.target.checked })}
                    className="size-4 accent-primary rounded cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold">🚀 Grid de Lançamento</div>
                    <div className="text-[11px] text-muted-foreground">Painel de lançamentos e produtos.</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-xl border border-border/70 hover:bg-muted/20 cursor-pointer transition-colors bg-background/40">
                  <input
                    type="checkbox"
                    checked={!!form.has_editorial_calendar}
                    onChange={(e) => setForm({ ...form, has_editorial_calendar: e.target.checked })}
                    className="size-4 accent-primary rounded cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold">📅 Calendário Editorial</div>
                    <div className="text-[11px] text-muted-foreground">Planejamento e aprovação de posts.</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Observações Internas
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

          <TabsContent value="portal" className="mt-4 space-y-4">
            <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
              <div>
                <h3 className="font-display font-semibold text-sm">Portal Minha Kasa</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Personalize a interface que o cliente acessa para aprovação de demandas e visualização de jobs.
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                  Capa do Portal (Banner)
                </Label>
                <ImageUpload
                  value={form.portal_cover_url}
                  onChange={(url) => setForm({ ...form, portal_cover_url: url })}
                  folder="clients/covers"
                  label="Enviar capa"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                  Identificador / Slug do Portal
                </Label>
                <Input
                  value={form.portal_slug ?? ""}
                  onChange={(e) => {
                    const slug = e.target.value
                      .toLowerCase()
                      .normalize("NFD")
                      .replace(/[̀-ͯ]/g, "")
                      .replace(/[^a-z0-9-]+/g, "-")
                      .replace(/^-+|-+$/g, "");
                    setForm({ ...form, portal_slug: slug });
                  }}
                  placeholder="ex: cliente-marca"
                  className="h-9 text-xs font-mono-kasa"
                />
              </div>

              {form.portal_slug && (
                <div className="space-y-1.5 p-3 rounded-xl bg-muted/20 border border-border/70">
                  <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                    Link Público do Portal
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={`${typeof window !== "undefined" ? window.location.origin : ""}/minha-kasa/${form.portal_slug}`}
                      className="font-mono-kasa text-xs h-9"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-lg"
                      onClick={() => {
                        const url = `${window.location.origin}/minha-kasa/${form.portal_slug}`;
                        navigator.clipboard.writeText(url);
                        toast.success("Link copiado com sucesso!");
                      }}
                    >
                      <Copy className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-lg"
                      onClick={() => window.open(`/minha-kasa/${form.portal_slug}`, "_blank")}
                    >
                      <ExternalLink className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-row sm:justify-between gap-2 pt-2 border-t border-border/60">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 h-9 gap-1.5 font-medium"
          >
            <Trash2 className="size-3.5" /> Excluir Cliente
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-9 text-xs">
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => mut.mutate()}
              disabled={mut.isPending || !form.name}
              className="h-9 text-xs font-medium gap-1.5"
            >
              {mut.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Building2 className="size-3.5" />}
              Salvar Alterações
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
      <DeleteClientDialog
        clientId={client.id}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => {
          onOpenChange(false);
          navigate({ to: "/clientes" });
        }}
      />
    </Dialog>
  );
}
