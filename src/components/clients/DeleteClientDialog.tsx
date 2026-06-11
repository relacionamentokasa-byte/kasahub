import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Ban, Trash2 } from "lucide-react";
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
      toast.success("Cliente removido.");
      onOpenChange(false);
      onDeleted?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !mut.isPending && onOpenChange(o)}>
      <DialogContent className="bg-surface border-border sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" /> Excluir cliente
          </DialogTitle>
          <DialogDescription>
            Esta ação removerá o cliente permanentemente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Label>Digite CONFIRMAR para excluir:</Label>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="CONFIRMAR" />
        </div>

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            variant="destructive"
            onClick={() => mut.mutate()}
            disabled={typed !== "CONFIRMAR" || mut.isPending}
          >
            Excluir permanentemente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
