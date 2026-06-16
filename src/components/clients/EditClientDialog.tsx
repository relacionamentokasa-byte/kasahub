import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateClient } from "@/lib/ops-api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";

import { ClientServicesManager } from "@/components/clients/ClientServicesManager";
import { DeleteClientDialog } from "@/components/clients/DeleteClientDialog";
import { toast } from "sonner";
import { Trash2, Copy, ExternalLink } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

type Client = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  document: string | null;
  website?: string | null;
  address?: string | null;
  notes: string | null;
  logo_url: string | null;
  brand_primary: string | null;
  status: string;
  contract_type?: string | null;
  contract_value?: number | null;
  start_date?: string | null;
  portal_slug?: string | null;
  portal_enabled?: boolean | null;
  portal_cover_url?: string | null;
  portal_primary_color?: string | null;
  portal_cover_color?: string | null;
};


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
  const init = () => ({
    name: client.name ?? "",
    company: client.company ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    document: client.document ?? "",
    website: client.website ?? "",
    address: client.address ?? "",
    notes: client.notes ?? "",
    logo_url: (client.logo_url ?? "") as string | null,
    brand_primary: client.brand_primary ?? "#FFBC45",
    status: client.status ?? "active",
    contract_type: client.contract_type ?? "recurring",
    contract_value: Number(client.contract_value ?? 0),
    start_date: client.start_date ?? "",
    portal_slug: client.portal_slug ?? "",
    portal_enabled: !!client.portal_enabled,
    portal_cover_url: (client.portal_cover_url ?? "") as string | null,
    portal_primary_color: (client.portal_primary_color ?? "#FFBC45") as string,
    portal_cover_color: (client.portal_cover_color ?? "#1A1A2E") as string,
  });

  const [form, setForm] = useState(init);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (open) setForm(init());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, client]);

  const mut = useMutation({
    mutationFn: () =>
      updateClient(client.id, {
        ...form,
        logo_url: form.logo_url || null,
        start_date: form.start_date || null,
        portal_slug: (form.portal_slug || "").trim() || null,
        portal_cover_url: form.portal_cover_url || null,
        portal_primary_color: form.portal_primary_color || null,
        portal_cover_color: form.portal_cover_color || null,
      } as any),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", client.id] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente atualizado");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Editar cliente</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="dados" className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="contrato">Contrato</TabsTrigger>
            <TabsTrigger value="servicos">Serviços</TabsTrigger>
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
              <Label>Nome *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nome completo do cliente"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Empresa</Label>
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
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@cliente.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Endereço</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Rua, número, cidade, estado" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Cor da marca</Label>
                <div className="flex gap-2">
                  <Input type="color" value={form.brand_primary} onChange={(e) => setForm({ ...form, brand_primary: e.target.value })} className="w-12 p-1 h-10" />
                  <Input value={form.brand_primary} onChange={(e) => setForm({ ...form, brand_primary: e.target.value })} />
                </div>
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

          <TabsContent value="contrato" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo de Contrato</Label>
                <select
                  value={form.contract_type}
                  onChange={(e) => setForm({ ...form, contract_type: e.target.value })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="recurring">Mensal (recorrente)</option>
                  <option value="one_time">Projeto único</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor do Contrato (R$)</Label>
                <Input
                  type="number"
                  value={form.contract_value}
                  onChange={(e) => setForm({ ...form, contract_value: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Data de Início</Label>
                <Input
                  type="date"
                  value={form.start_date ?? ""}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="servicos" className="mt-4">
            <ClientServicesManager clientId={client.id} />
          </TabsContent>

          <TabsContent value="portal" className="mt-4 space-y-4">
            <div className="rounded-xl border border-border bg-background/40 p-4 space-y-4">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-1.5">👁️ Portal Minha Kasa</h3>
                <p className="text-xs text-foreground/50 mt-0.5">
                  Defina um identificador único (slug) para gerar o link público do cliente.
                  No portal, ele verá apenas os jobs marcados com <strong>"Mostrar no Minha Kasa"</strong>.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Capa do Portal (banner)</Label>
                <ImageUpload
                  value={form.portal_cover_url}
                  onChange={(url) => setForm({ ...form, portal_cover_url: url })}
                  folder="clients/covers"
                  label="Enviar capa"
                />
                <p className="text-[10px] text-foreground/40">
                  Imagem horizontal exibida no topo do portal do cliente. Recomendado 1600×400px. Se vazio, usamos um gradiente padrão da Kasa.
                </p>
              </div>


              <div className="space-y-1.5">
                <Label>Slug do Portal</Label>
                <Input
                  value={form.portal_slug ?? ""}
                  onChange={(e) => {
                    const slug = e.target.value
                      .toLowerCase()
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .replace(/[^a-z0-9-]+/g, "-")
                      .replace(/^-+|-+$/g, "");
                    setForm({ ...form, portal_slug: slug });
                  }}
                  placeholder="ex: kasa-beauty"
                />
                <p className="text-[10px] text-foreground/40">
                  Use apenas letras minúsculas, números e hífens.
                </p>
              </div>

              {form.portal_slug && (
                <div className="space-y-1.5">
                  <Label>Link público</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={`${typeof window !== "undefined" ? window.location.origin : ""}/minha-kasa/${form.portal_slug}`}
                      className="font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const url = `${window.location.origin}/minha-kasa/${form.portal_slug}`;
                        navigator.clipboard.writeText(url);
                        toast.success("Link copiado!");
                      }}
                    >
                      <Copy className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(`/minha-kasa/${form.portal_slug}`, "_blank")}
                    >
                      <ExternalLink className="size-4" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-foreground/40">
                    Salve o cliente antes de compartilhar para garantir que o slug esteja persistido.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-row sm:justify-between gap-2 mt-4">
          <Button
            variant="ghost"
            onClick={() => setDeleteOpen(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-4 mr-1" /> Excluir cliente
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              onClick={() => mut.mutate()}
              disabled={mut.isPending || !form.name}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Salvar
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
