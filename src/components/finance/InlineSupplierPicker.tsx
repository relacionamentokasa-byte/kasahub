import { useState } from "react";
import { ChevronDown, Check, Building2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchSuppliers } from "@/lib/suppliers-api";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Props {
  transactionId: string;
  currentSupplierId: string | null | undefined;
  currentSupplierName: string | null | undefined;
}

export function InlineSupplierPicker({
  transactionId,
  currentSupplierId,
  currentSupplierName,
}: Props) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: fetchSuppliers,
  });

  const updateSupplier = useMutation({
    mutationFn: async (supplierId: string | null) => {
      const { error } = await (supabase as any)
        .from("transactions")
        .update({ supplier_id: supplierId })
        .eq("id", transactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Fornecedor vinculado");
      setOpen(false);
    },
    onError: (e: any) => toast.error("Erro: " + (e?.message || "")),
  });

  const handleSelect = (id: string | null) => {
    if (id === currentSupplierId) {
      setOpen(false);
      return;
    }
    updateSupplier.mutate(id);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "group/picker mt-0.5 inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 -mx-1 -my-0.5 hover:bg-muted/50 transition-colors text-left",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {currentSupplierId ? (
            <>
              <Avatar className="size-4">
                <AvatarFallback className="text-[8px] font-bold bg-amber-500/15 text-amber-700">
                  {(currentSupplierName || "?").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] text-foreground/40 font-bold uppercase truncate max-w-[200px]">
                {currentSupplierName || "—"}
              </span>
              <ChevronDown className="size-2.5 text-foreground/30 group-hover/picker:text-foreground/60 transition-colors" />
            </>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] text-primary/80 font-bold uppercase underline-offset-2 hover:underline">
              <Building2 className="size-2.5" />
              + Vincular Fornecedor
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Buscar fornecedor..." className="h-9" />
          <CommandList>
            <CommandEmpty>Nenhum fornecedor encontrado.</CommandEmpty>
            <CommandGroup>
              {currentSupplierId && (
                <CommandItem
                  value="__remove__"
                  onSelect={() => handleSelect(null)}
                  className="text-rose-500"
                >
                  Remover vínculo
                </CommandItem>
              )}
              {suppliers.map((s) => {
                const isActive = s.id === currentSupplierId;
                return (
                  <CommandItem
                    key={s.id}
                    value={s.name}
                    onSelect={() => handleSelect(s.id)}
                    className="flex items-center justify-between"
                  >
                    <span className="truncate">{s.name}</span>
                    {isActive && <Check className="size-3.5 text-primary" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
