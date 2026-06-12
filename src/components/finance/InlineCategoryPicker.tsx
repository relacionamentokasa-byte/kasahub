import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchCategories } from "@/lib/finance-api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface InlineCategoryPickerProps {
  transactionId: string;
  currentCategoryId: string | null | undefined;
  currentCategoryName: string | null | undefined;
  transactionType: "income" | "expense" | string | null | undefined;
}

export function InlineCategoryPicker({
  transactionId,
  currentCategoryId,
  currentCategoryName,
  transactionType,
}: InlineCategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const updateCategory = useMutation({
    mutationFn: async (novoCategoriaId: string) => {
      const { error } = await supabase
        .from("transactions")
        .update({ category_id: novoCategoriaId })
        .eq("id", transactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Categoria atualizada");
      setOpen(false);
    },
    onError: (e: any) => {
      toast.error("Erro ao atualizar categoria: " + (e?.message || ""));
    },
  });

  const filtered = (categories as any[])
    .filter((c) => !transactionType || c.type === transactionType)
    .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));

  const label = currentCategoryName || "Geral";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-border bg-background hover:bg-muted text-[10px] font-mono-kasa uppercase tracking-tight outline-none transition-colors"
      >
        {label}
        <ChevronDown className="size-2.5 text-foreground/50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[220px]">
        {filtered.length === 0 ? (
          <div className="px-2 py-3 text-xs text-foreground/50">
            Nenhuma categoria cadastrada.
          </div>
        ) : (
          filtered.map((cat: any) => {
            const isActive = cat.id === currentCategoryId;
            return (
              <DropdownMenuItem
                key={cat.id}
                onClick={() => {
                  if (!isActive) updateCategory.mutate(cat.id);
                  else setOpen(false);
                }}
                className="flex items-center justify-between"
              >
                <span className="truncate">{cat.name}</span>
                {isActive && <Check className="size-3.5 text-primary" />}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
