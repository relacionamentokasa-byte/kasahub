import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, FileText, Edit, Trash2, Archive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
      toast.success("Template salvo com sucesso!");
      setIsDialogOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: deleteContractTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract-templates"] });
      toast.success("Template arquivado com sucesso!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = templates.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar templates de contrato..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-card border-border/80 rounded-lg text-xs"
          />
        </div>
        <Button
          onClick={() => {
            setEditing({ title: "", content: "" });
            setIsDialogOpen(true);
          }}
          disabled={!canEdit}
          size="sm"
          className="gap-1.5 h-9 text-xs font-medium"
        >
          <Plus className="size-3.5" /> Novo Template
        </Button>
      </div>

      {isLoading ? (
        <div className="p-12 flex items-center justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((template) => (
            <div
              key={template.id}
              className="group rounded-xl border border-border/80 bg-card p-4 hover:border-primary/40 transition-all flex flex-col justify-between shadow-xs hover:shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <FileText className="size-4.5" />
                  </div>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-foreground"
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
                      className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10"
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
                <h3 className="font-semibold text-xs leading-tight text-foreground">{template.title}</h3>
                <p className="text-[10px] text-muted-foreground font-mono-kasa mt-1">
                  Criado em {new Date(template.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center border border-dashed border-border/80 rounded-xl text-muted-foreground text-xs bg-muted/20">
              Nenhum template de contrato encontrado.
            </div>
          )}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight">
              <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <FileText className="size-5" />
              </div>
              <span>{editing?.id ? `Editar Template · ${editing.title}` : "Novo Template de Contrato"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Estruture o modelo de minuta jurídica utilizado na geração de propostas e contratos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 pt-1">
            <div className="space-y-1">
              <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                Título do Modelo *
              </Label>
              <Input
                value={editing?.title || ""}
                onChange={(e) =>
                  setEditing((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Ex: Contrato de Gestão de Redes Sociais ou Prestação de Serviços"
                className="h-9 text-xs font-medium"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                  Cláusulas e Conteúdo Jurídico *
                </Label>
                <span className="text-[10px] font-mono-kasa text-muted-foreground">
                  Tags: {"{{cliente}}"}, {"{{cnpj}}"}, {"{{valor}}"}, {"{{data}}"}
                </span>
              </div>
              <Textarea
                value={editing?.content || ""}
                onChange={(e) =>
                  setEditing((p) => ({ ...p, content: e.target.value }))
                }
                rows={12}
                className="font-mono-kasa text-xs leading-relaxed resize-y"
                placeholder="Insira as cláusulas e parágrafos do contrato aqui..."
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(false)}
              className="h-9 text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => saveMut.mutate(editing!)}
              disabled={saveMut.isPending || !editing?.title?.trim() || !editing?.content?.trim()}
              size="sm"
              className="h-9 text-xs font-medium gap-1.5"
            >
              {saveMut.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />}
              Salvar Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
