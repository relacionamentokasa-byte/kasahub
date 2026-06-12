import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Tag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  fetchCategoriasFinanceiras,
  createCategoriaFinanceira,
  deleteCategoriaFinanceira,
  type CategoriaTipo,
  type CategoriaFinanceira,
} from "@/lib/categorias-financeiras-api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoriesManagerDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<CategoriaTipo>("Receita");
  const [newName, setNewName] = useState("");

  const { data: categorias = [], isLoading } = useQuery({
    queryKey: ["categorias_financeiras"],
    queryFn: fetchCategoriasFinanceiras,
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: ({ nome, tipo }: { nome: string; tipo: CategoriaTipo }) =>
      createCategoriaFinanceira(nome, tipo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias_financeiras"] });
      setNewName("");
      toast.success("Categoria criada!");
    },
    onError: (e: any) => {
      toast.error(e.message?.includes("duplicate") ? "Categoria já existe." : "Erro ao criar categoria.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategoriaFinanceira(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias_financeiras"] });
      toast.success("Categoria excluída.");
    },
    onError: () => toast.error("Erro ao excluir categoria."),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const nome = newName.trim();
    if (!nome) return;
    createMutation.mutate({ nome, tipo: tab });
  };

  const list = (tipo: CategoriaTipo) =>
    categorias.filter((c: CategoriaFinanceira) => c.tipo === tipo);

  const renderList = (tipo: CategoriaTipo) => {
    const items = list(tipo);
    return (
      <ScrollArea className="h-[280px] pr-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-10">
            Nenhuma categoria cadastrada.
          </p>
        ) : (
          <ul className="space-y-1">
            {items.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between px-3 py-2 rounded-md border border-border bg-surface/50 hover:bg-surface transition-colors"
              >
                <span className="text-sm">{c.nome}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                  onClick={() => {
                    if (confirm(`Excluir a categoria "${c.nome}"?`)) {
                      deleteMutation.mutate(c.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="size-4 text-primary" />
            Gestão de Categorias
          </DialogTitle>
          <DialogDescription>
            Organize suas categorias de receitas e despesas.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as CategoriaTipo)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="Receita">Receitas</TabsTrigger>
            <TabsTrigger value="Despesa">Despesas</TabsTrigger>
          </TabsList>

          <form onSubmit={handleCreate} className="flex items-center gap-2 mt-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={`Nova categoria de ${tab.toLowerCase()}...`}
              className="flex-1"
            />
            <Button type="submit" disabled={!newName.trim() || createMutation.isPending} className="gap-1">
              {createMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Adicionar
            </Button>
          </form>

          <TabsContent value="Receita" className="mt-4">
            {renderList("Receita")}
          </TabsContent>
          <TabsContent value="Despesa" className="mt-4">
            {renderList("Despesa")}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
