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
  Briefcase,
  Layers,
  ListChecks,
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
  DialogDescription,
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
      toast.success("Serviço atualizado com sucesso!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteService(id),
    onSuccess: () => {
      invalidate();
      toast.success("Serviço excluído com sucesso!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="p-12 flex justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold flex items-center gap-2">
            <Briefcase className="size-4 text-primary" /> Serviços e Jobs
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Biblioteca central de serviços, escopos sugeridos e etapas de execução da agência.
          </p>
        </div>
        <Button
          onClick={() => setCreating(true)}
          disabled={!canEdit}
          size="sm"
          className="gap-1.5 h-9 text-xs font-medium"
        >
          <Plus className="size-3.5" /> Novo Serviço
        </Button>
      </div>

      <div className="rounded-xl border border-border/80 bg-card divide-y divide-border/60 overflow-hidden shadow-xs">
        {services.length === 0 && (
          <div className="px-6 py-12 text-center text-xs text-muted-foreground">
            Nenhum serviço cadastrado ainda.
          </div>
        )}
        {services.map((s) => (
          <div key={s.id} className="p-3.5 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/10 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-xs leading-tight text-foreground">{s.name}</p>
                {s.category && (
                  <span className="text-[10px] font-mono-kasa uppercase bg-muted/50 border border-border/60 text-muted-foreground px-1.5 py-0.5 rounded">
                    {s.category}
                  </span>
                )}
                {!s.is_active && (
                  <Badge variant="secondary" className="text-[10px] font-mono-kasa">
                    Inativo
                  </Badge>
                )}
                {s.archived_at && (
                  <Badge variant="outline" className="text-[10px] font-mono-kasa border-border/80">
                    Arquivado
                  </Badge>
                )}
              </div>
              {s.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 sm:line-clamp-1">
                  {s.description}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 shrink-0">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(s)}
                disabled={!canEdit}
                className="h-8 px-2.5 text-xs gap-1 cursor-pointer"
              >
                <Pencil className="size-3" /> <span className="sm:inline">Editar</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  archiveMut.mutate({ id: s.id, archive: !s.archived_at })
                }
                disabled={!canEdit}
                className="h-8 px-2.5 text-xs gap-1 cursor-pointer"
              >
                {s.archived_at ? (
                  <>
                    <ArchiveRestore className="size-3" /> <span className="sm:inline">Reativar</span>
                  </>
                ) : (
                  <>
                    <Archive className="size-3" /> <span className="sm:inline">Arquivar</span>
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
                className="h-8 w-8 sm:w-auto sm:px-2 p-0 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
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
    checklist_items: (service as any)?.checklist_items ?? [],
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
        default_scope: form.default_scope.filter((x) => x.trim()),
        checklist_items: form.checklist_items.filter((it: any) => (it.text || it).trim()),
        contract_template_id: form.contract_template_id || null,
      } as any;
      if (!payload.name) throw new Error("Nome obrigatório");
      if (service) return updateService(service.id, payload);
      return createService(payload);
    },
    onSuccess: () => {
      toast.success("Serviço salvo com sucesso!");
      qc.invalidateQueries({ queryKey: ["services"] });
      onSaved();
      if (!service) onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight">
            <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Briefcase className="size-5" />
            </div>
            <span>{service ? `Editar Serviço · ${service.name}` : "Novo Serviço"}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure o escopo padrão, contrato vinculado e etapas de execução do checklist.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full pt-1">
          <TabsList className="grid grid-cols-2 w-full h-9 bg-muted/50 p-1">
            <TabsTrigger value="general" className="text-xs font-medium gap-1.5">
              <Layers className="size-3.5" /> Geral & Escopo
            </TabsTrigger>
            <TabsTrigger value="checklist" className="text-xs font-medium gap-1.5">
              <ListChecks className="size-3.5" /> Etapas de Execução
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-3.5 pt-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Nome do Serviço *
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Gestão de Redes Sociais ou Tráfego Pago"
                className="h-9 text-xs font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                  Categoria
                </Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Ex: Social Media, Design, Tráfego"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1 flex flex-col justify-end">
                <div className="flex items-center justify-between h-9 px-3 rounded-md border border-input bg-background/50">
                  <span className="text-xs font-medium">Status do Serviço</span>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.is_active}
                      onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                    />
                    <span className="text-xs text-muted-foreground font-mono-kasa">
                      {form.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Template Contratual Padrão
              </Label>
              <select
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
                value={form.contract_template_id}
                onChange={(e) => setForm({ ...form, contract_template_id: e.target.value })}
              >
                <option value="">— Sem contrato padrão associado —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Descrição Resumida
              </Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Breve descrição do serviço…"
                className="text-xs resize-none"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Escopo Padrão Sugerido (um item por linha)
              </Label>
              <Textarea
                rows={4}
                value={form.default_scope.join("\n")}
                onChange={(e) =>
                  setForm({
                    ...form,
                    default_scope: e.target.value.split("\n"),
                  })
                }
                placeholder="Item de escopo 1&#10;Item de escopo 2&#10;Item de escopo 3"
                className="text-xs resize-none font-mono-kasa"
              />
            </div>
          </TabsContent>

          <TabsContent value="checklist" className="space-y-3 pt-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">Etapas Pré-definidas do Job</p>
              <p className="text-xs text-muted-foreground">
                Itens incluídos automaticamente no checklist operacional de qualquer novo Job criado com este serviço.
              </p>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Digite uma nova etapa e pressione Enter…"
                className="h-9 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const val = e.currentTarget.value.trim();
                    if (val) {
                      setForm({
                        ...form,
                        checklist_items: [...form.checklist_items, { text: val, required: false }],
                      });
                      e.currentTarget.value = "";
                    }
                  }
                }}
              />
            </div>

            <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
              {form.checklist_items.length === 0 && (
                <div className="py-8 text-center border border-dashed border-border/80 rounded-xl bg-muted/20">
                  <p className="text-xs text-muted-foreground">Nenhuma etapa pré-definida.</p>
                </div>
              )}
              {form.checklist_items.map((it: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-lg border border-border/60 group"
                >
                  <div className="size-4 rounded border border-primary/40 flex items-center justify-center bg-background shrink-0">
                    <div className="size-1.5 rounded-xs bg-primary" />
                  </div>
                  <Input
                    value={it.text || it}
                    onChange={(e) => {
                      const newItems = [...form.checklist_items];
                      newItems[idx] = { ...it, text: e.target.value };
                      setForm({ ...form, checklist_items: newItems });
                    }}
                    className="h-7 border-none bg-transparent shadow-none focus-visible:ring-0 p-0 text-xs flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive opacity-70 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      const newItems = form.checklist_items.filter((_: any, i: number) => i !== idx);
                      setForm({ ...form, checklist_items: newItems });
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-9 text-xs"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || !form.name.trim()}
            size="sm"
            className="h-9 text-xs font-medium gap-1.5"
          >
            {saveMut.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Briefcase className="size-3.5" />}
            Salvar Serviço
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
