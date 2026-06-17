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
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="size-4 text-primary" />
            Fornecedores
          </DialogTitle>
          <DialogDescription>
            Cadastre órgãos, provedores e demais favorecidos para vincular em despesas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreate} className="space-y-2 pt-2">
          <div className="grid grid-cols-[1fr_180px_auto] gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome (ex: Vivo, Receita Federal)"
            />
            <Input
              value={doc}
              onChange={(e) => setDoc(e.target.value)}
              placeholder="CNPJ/CPF (opcional)"
            />
            <Button type="submit" disabled={!name.trim() || createMut.isPending} className="gap-1">
              {createMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Adicionar
            </Button>
          </div>
        </form>

        <ScrollArea className="h-[320px] pr-3 mt-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : suppliers.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-10">
              Nenhum fornecedor cadastrado.
            </p>
          ) : (
            <ul className="space-y-1">
              {suppliers.map((s: Supplier) => {
                const isEditing = editingId === s.id;
                return (
                  <li
                    key={s.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-surface/50 hover:bg-surface transition-colors"
                  >
                    {isEditing ? (
                      <>
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="h-8 flex-1"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-emerald-500"
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
                          className="size-7"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{s.name}</p>
                          {s.document && (
                            <p className="text-[11px] text-muted-foreground truncate">{s.document}</p>
                          )}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={() => {
                            setEditingId(s.id);
                            setEditingName(s.name);
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                          onClick={() => {
                            if (confirm(`Excluir o fornecedor "${s.name}"?`)) {
                              deleteMut.mutate(s.id);
                            }
                          }}
                          disabled={deleteMut.isPending}
                        >
                          <Trash2 className="size-3.5" />
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
