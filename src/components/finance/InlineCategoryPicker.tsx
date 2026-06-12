import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface InlineCategoryPickerProps {
  transactionId: string;
  currentCategoryId: string | null | undefined;
  transactionType: "income" | "expense" | string | null | undefined;
}

interface CategoriaFinanceira {
  id: string;
  nome: string;
  tipo: "Receita" | "Despesa";
}

export function InlineCategoryPicker({
  transactionId,
  currentCategoryId,
  transactionType,
}: InlineCategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: categorias = [] } = useQuery<CategoriaFinanceira[]>({
    queryKey: ["categorias_financeiras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias_financeiras" as any)
        .select("id, nome, tipo")
        .order("tipo", { ascending: true })
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as CategoriaFinanceira[];
    },
  });

  const tipoAlvo: "Receita" | "Despesa" | null =
    transactionType === "income"
      ? "Receita"
      : transactionType === "expense"
      ? "Despesa"
      : null;

  const categoriasFiltradas = categorias.filter(
    (c) => !tipoAlvo || c.tipo === tipoAlvo,
  );

  const atual = categorias.find((c) => c.id === currentCategoryId);

  const handleUpdateCategoria = async (categoriaId: string) => {
    const { error } = await supabase
      .from("transactions")
      .update({ category_id: categoriaId })
      .eq("id", transactionId);
    if (error) throw error;
  };

  const mut = useMutation({
    mutationFn: handleUpdateCategoria,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Categoria atualizada");
      setOpen(false);
    },
    onError: (e: any) => {
      toast.error("Erro ao atualizar categoria: " + (e?.message || ""));
    },
  });

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-border bg-background hover:bg-muted text-[10px] font-mono-kasa uppercase tracking-tight outline-none transition-colors"
      >
        {atual?.nome || "Vincular Categoria"}
        <ChevronDown className="size-2.5 text-foreground/50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px] max-h-[320px] overflow-y-auto">
        {categoriasFiltradas.length === 0 ? (
          <div className="px-2 py-3 text-xs text-foreground/50">
            Nenhuma categoria de {tipoAlvo || "—"} cadastrada.
          </div>
        ) : (
          categoriasFiltradas.map((cat) => {
            const isActive = cat.id === currentCategoryId;
            return (
              <DropdownMenuItem
                key={cat.id}
                onClick={() => {
                  if (!isActive) mut.mutate(cat.id);
                  else setOpen(false);
                }}
                className="flex items-center justify-between"
              >
                <span className="truncate">{cat.nome}</span>
                {isActive && <Check className="size-3.5 text-primary" />}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
