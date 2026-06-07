import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Clock, User, Landmark, Link as LinkIcon } from "lucide-react";

export function TransactionAuditDialog({
  transaction,
  open,
  onOpenChange,
}: {
  transaction: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: creator } = useQuery({
    queryKey: ["user_profile", transaction?.created_by],
    queryFn: async () => {
      if (!transaction?.created_by) return null;
      // Note: In Supabase users are in auth.users, but we might have a public.profiles
      // For now let's try to get from the system log or assume profile exists
      // Just get data, handle absence of profiles safely
      const { data } = await supabase.from('profiles').select('*').eq('id', transaction.created_by).single();
      return data;
    },
    enabled: !!transaction?.created_by,
  });

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Detalhamento e Auditoria</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-foreground/50 text-xs">Descrição</Label>
              <p className="text-sm font-medium">{transaction.description}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-foreground/50 text-xs">Valor</Label>
              <p className="text-sm font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.amount)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-foreground/50 text-xs flex items-center gap-1">
                <Clock className="size-3" /> Vencimento
              </Label>
              <p className="text-sm">{new Date(transaction.due_date).toLocaleDateString('pt-BR')}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-foreground/50 text-xs flex items-center gap-1">
                <CheckCircle className="size-3" /> Status
              </Label>
              <p className="text-sm capitalize">{transaction.status}</p>
            </div>
          </div>

          <div className="border-t border-border pt-4 mt-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/40">Rastreabilidade</h4>
            
            <div className="flex items-center gap-2 text-sm">
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                <LinkIcon className="size-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">Origem: <span className="capitalize text-primary">{transaction.origin_type || 'Não identificada'}</span></p>
                {transaction.contract_id && <p className="text-xs text-foreground/50">Vínculo: Contrato</p>}
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <div className="size-8 rounded-full bg-foreground/5 flex items-center justify-center">
                <User className="size-4 text-foreground/40" />
              </div>
              <div>
                <p className="font-medium">Responsável: {(creator as any)?.name || (creator as any)?.full_name || 'Sistema'}</p>
                <p className="text-xs text-foreground/50">Criado em: {new Date(transaction.created_at).toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { CheckCircle } from "lucide-react";
