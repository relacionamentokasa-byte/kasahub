import { useState } from "react";
import { ChevronDown, Check, UserPlus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchClients } from "@/lib/ops-api";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface InlineClientPickerProps {
  transactionId: string;
  currentClientId: string | null | undefined;
  currentClientName: string | null | undefined;
  currentClientPhotoUrl?: string | null;
}

export function InlineClientPicker({
  transactionId,
  currentClientId,
  currentClientName,
  currentClientPhotoUrl,
}: InlineClientPickerProps) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: fetchClients,
  });

  const updateClient = useMutation({
    mutationFn: async (novoClienteId: string | null) => {
      const { error } = await supabase
        .from("transactions")
        .update({ client_id: novoClienteId })
        .eq("id", transactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["contas_bancarias"] });
      toast.success("Cliente vinculado com sucesso");
      setOpen(false);
    },
    onError: (e: any) => {
      toast.error("Erro ao vincular cliente: " + (e?.message || ""));
    },
  });

  const handleSelect = (id: string) => {
    if (id === currentClientId) {
      setOpen(false);
      return;
    }
    updateClient.mutate(id);
  };

  const sorted = ([...(clients as any[])]).sort((a: any, b: any) =>
    (a.company || a.name || "").localeCompare(b.company || b.name || ""),
  );

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
          {currentClientId ? (
            <>
              <span className="text-[10px] text-foreground/40 font-bold uppercase truncate max-w-[200px]">
                {currentClientName || "—"}
              </span>
              <ChevronDown className="size-2.5 text-foreground/30 group-hover/picker:text-foreground/60 transition-colors" />
            </>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] text-primary/80 font-bold uppercase underline-offset-2 hover:underline">
              <UserPlus className="size-2.5" />
              + Vincular Cliente
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Buscar cliente..." className="h-9" />
          <CommandList>
            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
            <CommandGroup>
              {sorted.map((c: any) => {
                const label = c.company || c.name || "Sem nome";
                const isActive = c.id === currentClientId;
                return (
                  <CommandItem
                    key={c.id}
                    value={label}
                    onSelect={() => handleSelect(c.id)}
                    className="flex items-center justify-between"
                  >
                    <span className="truncate">{label}</span>
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
