import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Building2, Pencil, X, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  fetchSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  type Supplier,
} from "@/lib/suppliers-api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuppliersManagerDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [doc, setDoc] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: fetchSuppliers,
    enabled: open,
  });

  const createMut = useMutation({
    mutationFn: () =>
      createSupplier({ name: name.trim(), document: doc.trim() || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      setName("");
      setDoc("");
      toast.success("Fornecedor cadastrado!");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao cadastrar."),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateSupplier(id, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      setEditingId(null);
      toast.success("Fornecedor atualizado.");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao atualizar."),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSupplier(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Fornecedor excluído.");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao excluir."),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMut.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight">
            <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Building2 className="size-5" />
            </div>
            <span>Fornecedores</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            Cadastre órgãos, provedores e demais favorecidos para vincular em despesas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreate} className="space-y-2 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px_auto] gap-2 bg-muted/40 p-3 rounded-xl border border-border/70 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Nome do fornecedor</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Vivo, Google, Receita..."
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">CNPJ / CPF</label>
              <Input
                value={doc}
                onChange={(e) => setDoc(e.target.value)}
                placeholder="Opcional"
                className="h-9 text-xs font-mono-kasa tabular-nums"
              />
            </div>
            <Button type="submit" disabled={!name.trim() || createMut.isPending} className="gap-1.5 h-9 text-xs font-medium">
              {createMut.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Adicionar
            </Button>
          </div>
        </form>

        <ScrollArea className="h-[320px] pr-2 mt-2 border border-border/80 rounded-xl bg-card p-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-xs text-muted-foreground font-mono-kasa gap-2">
              <Loader2 className="size-4 animate-spin text-primary" /> Carregando fornecedores...
            </div>
          ) : suppliers.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-12 font-mono-kasa">
              Nenhum fornecedor cadastrado.
            </p>
          ) : (
            <ul className="space-y-1.5 p-1">
              {suppliers.map((s: Supplier) => {
                const isEditing = editingId === s.id;
                return (
                  <li
                    key={s.id}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border/70 bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    {isEditing ? (
                      <>
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="h-8 flex-1 text-xs"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-emerald-500 hover:bg-emerald-500/10 rounded-lg"
                          onClick={() =>
                            editingName.trim() &&
                            updateMut.mutate({ id: s.id, name: editingName.trim() })
                          }
                        >
                          <Check className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 rounded-lg"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate text-foreground">{s.name}</p>
                          {s.document && (
                            <p className="text-[11px] text-muted-foreground font-mono-kasa tabular-nums truncate">{s.document}</p>
                          )}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-muted-foreground hover:text-foreground rounded-lg"
                          onClick={() => {
                            setEditingId(s.id);
                            setEditingName(s.name);
                          }}
                          title="Editar nome"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          onClick={() => {
                            if (confirm(`Excluir o fornecedor "${s.name}"?`)) {
                              deleteMut.mutate(s.id);
                            }
                          }}
                          disabled={deleteMut.isPending}
                          title="Excluir fornecedor"
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
