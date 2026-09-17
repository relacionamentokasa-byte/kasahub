import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function DeleteClientDialog({
  clientId,
  open,
  onOpenChange,
  onDeleted,
}: {
  clientId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDeleted?: () => void;
}) {
  const qc = useQueryClient();
  const [typed, setTyped] = useState("");

  const mut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clients").delete().eq("id", clientId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente removido com sucesso!");
      onOpenChange(false);
      onDeleted?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AlertDialog open={open} onOpenChange={(o) => !mut.isPending && onOpenChange(o)}>
      <AlertDialogContent className="sm:max-w-[480px]">
        <AlertDialogHeader className="space-y-1">
          <AlertDialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight text-destructive">
            <div className="size-9 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive shrink-0">
              <Trash2 className="size-5" />
            </div>
            <span>Excluir Cliente Permanentemente</span>
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground pt-1">
            Esta ação excluirá todos os dados, contratos vinculados, históricos e acessos do portal do cliente. Essa operação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5 py-2">
          <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
            Digite <strong className="text-destructive font-bold">CONFIRMAR</strong> para prosseguir:
          </Label>
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="CONFIRMAR"
            className="h-9 text-xs font-mono-kasa font-semibold tracking-wider"
          />
        </div>

        <AlertDialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
          <AlertDialogCancel disabled={mut.isPending} className="h-9 text-xs">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              mut.mutate();
            }}
            disabled={typed !== "CONFIRMAR" || mut.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-9 text-xs font-medium gap-1.5"
          >
            {mut.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            Excluir Permanentemente
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
