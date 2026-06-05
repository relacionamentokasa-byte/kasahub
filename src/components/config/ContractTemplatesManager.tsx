import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, FileText, Edit, Trash2, Archive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  fetchContractTemplates,
  createContractTemplate,
  updateContractTemplate,
  deleteContractTemplate,
  type ContractTemplate,
} from "@/lib/contracts-api";
import { toast } from "sonner";

export function ContractTemplatesManager({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<ContractTemplate> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["contract-templates"],
    queryFn: fetchContractTemplates,
  });

  const saveMut = useMutation({
    mutationFn: async (vars: Partial<ContractTemplate>) => {
      if (vars.id) {
        return updateContractTemplate(vars.id, vars);
      }
      return createContractTemplate({
        title: vars.title!,
        content: vars.content!,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract-templates"] });
      toast.success("Template salvo");
      setIsDialogOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: deleteContractTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract-templates"] });
      toast.success("Template arquivado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = templates.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground/40" />
          <Input
            placeholder="Buscar templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          onClick={() => {
            setEditing({ title: "", content: "" });
            setIsDialogOpen(true);
          }}
          disabled={!canEdit}
          className="gap-2"
        >
          <Plus className="size-4" /> Novo template
        </Button>
      </div>

      {isLoading ? (
        <div className="p-12 flex items-center justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((template) => (
            <div
              key={template.id}
              className="group rounded-xl border border-border bg-surface p-5 hover:border-primary/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="size-4 text-primary" />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => {
                        setEditing(template);
                        setIsDialogOpen(true);
                      }}
                      disabled={!canEdit}
                    >
                      <Edit className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm("Arquivar este template?")) {
                          delMut.mutate(template.id);
                        }
                      }}
                      disabled={!canEdit}
                    >
                      <Archive className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <h3 className="font-display font-bold">{template.title}</h3>
                <p className="text-[10px] text-foreground/40 font-mono-kasa mt-1">
                  Criado em {new Date(template.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-xl text-foreground/40">
              Nenhum template encontrado.
            </div>
          )}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border">
            <DialogTitle>
              {editing?.id ? "Editar template" : "Novo template de contrato"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-mono-kasa capitalize text-foreground/60">
                Título do modelo
              </label>
              <Input
                value={editing?.title || ""}
                onChange={(e) =>
                  setEditing((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Ex: Contrato de Gestão de Redes Sociais"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono-kasa capitalize text-foreground/60">
                  Conteúdo do contrato
                </label>
                <span className="text-[10px] text-foreground/40">
                  Variáveis: {"{{cliente}}"}, {"{{cnpj}}"}{" "}...
                </span>
              </div>
              <Textarea
                value={editing?.content || ""}
                onChange={(e) =>
                  setEditing((p) => ({ ...p, content: e.target.value }))
                }
                rows={15}
                className="font-mono text-xs leading-relaxed"
                placeholder="Insira as cláusulas do contrato aqui..."
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border bg-surface/50">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => saveMut.mutate(editing!)}
              disabled={saveMut.isPending || !editing?.title || !editing?.content}
              className="gap-2"
            >
              {saveMut.isPending && <Loader2 className="size-4 animate-spin" />}
              Salvar template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
