import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Props {
  transactionId: string;
  currentDate: string; // ISO YYYY-MM-DD
}

export function InlineDuePicker({ transactionId, currentDate }: Props) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const dateObj = currentDate ? parseISO(currentDate) : undefined;

  const mut = useMutation({
    mutationFn: async (novaData: Date) => {
      const iso = format(novaData, "yyyy-MM-dd");
      const { error } = await supabase
        .from("transactions")
        .update({ due_date: iso })
        .eq("id", transactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["finance-stats"] });
      qc.invalidateQueries({ queryKey: ["contas_bancarias"] });
      toast.success("Data de vencimento atualizada");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao atualizar data."),
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto px-1.5 py-1 -ml-1.5 font-medium text-sm gap-1 hover:bg-muted"
        >
          <CalendarIcon className="size-3 text-muted-foreground" />
          {dateObj ? format(dateObj, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
          <ChevronDown className="size-3 text-muted-foreground opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateObj}
          onSelect={(d) => d && mut.mutate(d)}
          initialFocus
          locale={ptBR}
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
