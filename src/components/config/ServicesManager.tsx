import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchContractTemplates } from "@/lib/contracts-api";
import {
  Archive,
  ArchiveRestore,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  archiveService,
  createService,
  deleteService,
  fetchServices,
  updateService,
  type Service,
} from "@/lib/services-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  canEdit: boolean;
}

export function ServicesManager({ canEdit }: Props) {
  const qc = useQueryClient();
  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services", "all"],
    queryFn: () => fetchServices(),
  });
  const [editing, setEditing] = useState<Service | null>(null);
  const [creating, setCreating] = useState(false);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["services"] });
  }

  const archiveMut = useMutation({
    mutationFn: ({ id, archive }: { id: string; archive: boolean }) =>
      archiveService(id, archive),
    onSuccess: () => {
      invalidate();
      toast.success("Serviço atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteService(id),
    onSuccess: () => {
      invalidate();
      toast.success("Serviço excluído");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-lg font-semibold">Serviços e Jobs</p>
          <p className="text-xs text-foreground/50">
            Biblioteca central de serviços da agência.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} disabled={!canEdit} className="gap-2">
          <Plus className="size-4" /> Novo serviço
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-surface divide-y divide-border">
        {services.length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-foreground/50">
            Nenhum serviço cadastrado ainda.
          </div>
        )}
        {services.map((s) => (
          <div key={s.id} className="px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm">{s.name}</p>
                {s.category && (
                  <span className="text-[10px] font-mono-kasa capitalize text-foreground/50">
                    {s.category}
                  </span>
                )}
                {!s.is_active && (
                  <Badge variant="secondary" className="text-[10px]">
                    Inativo
                  </Badge>
                )}
                {s.archived_at && (
                  <Badge variant="outline" className="text-[10px]">
                    Arquivado
                  </Badge>
                )}
              </div>
              {s.description && (
                <p className="text-xs text-foreground/50 mt-0.5 line-clamp-1">
                  {s.description}
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(s)}
              disabled={!canEdit}
              className="gap-1"
            >
              <Pencil className="size-3.5" /> Editar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                archiveMut.mutate({ id: s.id, archive: !s.archived_at })
              }
              disabled={!canEdit}
              className="gap-1"
            >
              {s.archived_at ? (
                <>
                  <ArchiveRestore className="size-3.5" /> Reativar
                </>
              ) : (
                <>
                  <Archive className="size-3.5" /> Arquivar
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (confirm(`Excluir o serviço "${s.name}"?`)) delMut.mutate(s.id);
              }}
              disabled={!canEdit}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {creating && (
        <ServiceFormDialog
          onClose={() => setCreating(false)}
          onSaved={() => {
            invalidate();
            setCreating(false);
          }}
        />
      )}
      {editing && (
        <ServiceFormDialog
          service={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            invalidate();
          }}
        />
      )}
    </div>
  );
}

function ServiceFormDialog({
  service,
  onClose,
  onSaved,
}: {
  service?: Service;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: service?.name ?? "",
    category: service?.category ?? "",
    description: service?.description ?? "",
    is_active: service?.is_active ?? true,
    default_scope: (service?.default_scope as string[]) ?? [],
    contract_template_id: (service as any)?.contract_template_id ?? "",
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["contract-templates"],
    queryFn: fetchContractTemplates,
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim() || null,
        description: form.description.trim() || null,
        is_active: form.is_active,
        default_scope: form.default_scope,
        contract_template_id: form.contract_template_id || null,
      } as any;
      if (!payload.name) throw new Error("Nome obrigatório");
      if (service) return updateService(service.id, payload);
      return createService(payload);
    },
    onSuccess: () => {
      toast.success("Serviço salvo");
      qc.invalidateQueries({ queryKey: ["services"] });
      onSaved();
      if (!service) onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{service ? "Editar serviço" : "Novo serviço"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">Geral</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Nome do serviço *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex.: Gestão de Redes Sociais"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Categoria</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Ex.: Social Media"
                />
              </div>
              <div className="space-y-1.5 flex items-end gap-2">
                <div className="flex items-center gap-2 h-9">
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  />
                  <span className="text-sm">
                    {form.is_active ? "Ativo" : "Inativo"}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Template Contratual Padrão</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={form.contract_template_id}
                  onChange={(e) => setForm({ ...form, contract_template_id: e.target.value })}
                >
                  <option value="">Sem contrato padrão</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição do Serviço</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Escopo Padrão (Sugestão)</Label>
              <Textarea
                rows={5}
                value={form.default_scope.join("\n")}
                onChange={(e) =>
                  setForm({
                    ...form,
                    default_scope: e.target.value.split("\n").filter((x) => x.trim()),
                  })
                }
                placeholder="Item 1&#10;Item 2&#10;Item 3"
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                {saveMut.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
                Salvar
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
