import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPartner, type PartnerType } from "@/lib/partners-api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function PartnerDialog({
  open,
  onOpenChange,
  partner,
  type,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  partner?: any;
  type: PartnerType;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: partner?.name ?? "",
    email: partner?.email ?? "",
  });

  const mut = useMutation({
    mutationFn: () => createPartner(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partners"] });
      toast.success("Parceiro salvo");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Novo parceiro</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
