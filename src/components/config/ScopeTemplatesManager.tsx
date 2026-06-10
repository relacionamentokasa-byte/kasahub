import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createScopeTemplate,
  deleteScopeTemplate,
  fetchScopeTemplates,
  updateScopeTemplate,
  type ScopeTemplate,
} from "@/lib/scope-templates-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ScopeEditor } from "../proposals/ScopeEditor";

export function ScopeTemplatesManager({ canEdit = true }: { canEdit?: boolean }) {
  const qc = useQueryClient();
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["scope-templates"],
    queryFn: fetchScopeTemplates,
  });

  const [editing, setEditing] = useState<ScopeTemplate | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", content: [] as string[] });

  function startNew() {
    setEditing(null);
    setForm({ name: "", category: "", content: [] });
    setOpen(true);
  }
  function startEdit(t: ScopeTemplate) {
    setEditing(t);
    const content = Array.isArray(t.content) 
      ? t.content 
      : (typeof t.content === 'string' ? t.content.split('\n').map(s => s.replace(/^[-\s*]+/, '').trim()).filter(Boolean) : []);
    setForm({ name: t.name, category: t.category ?? "", content });
    setOpen(true);
  }

  const saveMut = useMutation({
    mutationFn: () =>
      editing
        ? updateScopeTemplate(editing.id, {
            name: form.name,
            category: form.category || null,
            content: form.content as any,
          })
        : createScopeTemplate({
            name: form.name,
            category: form.category || null,
            content: form.content as any,
          }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scope-templates"] });
      toast.success("Modelo salvo");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteScopeTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scope-templates"] });
      toast.success("Modelo removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Modelos de escopo reutilizáveis para acelerar a criação de propostas.
        </p>
        {canEdit && (
          <Button onClick={startNew} size="sm">
            <Plus className="size-3.5" /> Novo Modelo
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="p-12 flex items-center justify-center">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : templates.length === 0 ? (
        <div className="p-12 text-center text-sm text-muted-foreground border-2 border-dashed border-border rounded-xl">
          Nenhum modelo cadastrado.
        </div>
      ) : (
        <div className="grid gap-2">
          {templates.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{t.name}</p>
                {t.category && (
                  <p className="text-xs text-muted-foreground">{t.category}</p>
                )}
              </div>
              {canEdit && (
                <>
                  <Button size="sm" variant="ghost" onClick={() => startEdit(t)}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Excluir modelo "${t.name}"?`)) delMut.mutate(t.id);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar modelo" : "Novo modelo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Nome</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Categoria</label>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Ex: Tráfego Pago, Conteúdo, Site"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Conteúdo</label>
              <ScopeEditor 
                value={form.content}
                onChange={(content) => setForm({ ...form, content })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => saveMut.mutate()}
              disabled={!form.name.trim() || form.content.length === 0 || saveMut.isPending}
            >
              {saveMut.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
