import { useState } from "react";
import { ChevronDown, Check, UserRound } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchPartners } from "@/lib/partners-api";
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

interface Props {
  transactionId: string;
  currentFreelancerId: string | null | undefined;
  currentFreelancerName: string | null | undefined;
  currentFreelancerPhotoUrl?: string | null;
}

export function InlineFreelancerPicker({
  transactionId,
  currentFreelancerId,
  currentFreelancerName,
  currentFreelancerPhotoUrl,
}: Props) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: freelancers = [] } = useQuery({
    queryKey: ["partners", "freelancer"],
    queryFn: () => fetchPartners("freelancer"),
  });

  const updateMut = useMutation({
    mutationFn: async (freelancerId: string | null) => {
      const { error } = await (supabase as any)
        .from("transactions")
        .update({ freelancer_id: freelancerId, supplier_id: null })
        .eq("id", transactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Freelancer vinculado");
      setOpen(false);
    },
    onError: (e: any) => toast.error("Erro: " + (e?.message || "")),
  });

  const handleSelect = (id: string | null) => {
    if (id === currentFreelancerId) {
      setOpen(false);
      return;
    }
    updateMut.mutate(id);
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
          {currentFreelancerId ? (
            <>
              <Avatar className="size-4">
                {currentFreelancerPhotoUrl ? <AvatarImage src={currentFreelancerPhotoUrl} alt={currentFreelancerName || ""} /> : null}
                <AvatarFallback className="text-[8px] font-bold">
                  {(currentFreelancerName || "?").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] text-foreground/40 font-bold uppercase truncate max-w-[200px]">
                {currentFreelancerName || "—"}
              </span>
              <ChevronDown className="size-2.5 text-foreground/30 group-hover/picker:text-foreground/60 transition-colors" />
            </>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] text-primary/80 font-bold uppercase underline-offset-2 hover:underline">
              <UserRound className="size-2.5" />
              + Vincular Freelancer
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Buscar freelancer..." className="h-9" />
          <CommandList>
            <CommandEmpty>
              Nenhum freelancer cadastrado. Cadastre em Parceiros → Freelancers.
            </CommandEmpty>
            <CommandGroup>
              {currentFreelancerId && (
                <CommandItem
                  value="__remove__"
                  onSelect={() => handleSelect(null)}
                  className="text-rose-500"
                >
                  Remover vínculo
                </CommandItem>
              )}
              {freelancers.map((f) => {
                const isActive = f.id === currentFreelancerId;
                return (
                  <CommandItem
                    key={f.id}
                    value={f.name}
                    onSelect={() => handleSelect(f.id)}
                    className="flex items-center justify-between"
                  >
                    <span className="truncate">{f.name}</span>
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
