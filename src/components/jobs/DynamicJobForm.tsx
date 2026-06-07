import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DynamicFormProps {
  serviceId: string | null;
  data: any;
  onChange: (newData: any) => void;
  readOnly?: boolean;
}

export function DynamicJobForm({ serviceId, data, onChange, readOnly }: DynamicFormProps) {
  const { data: service } = useQuery({
    queryKey: ["service-schema", serviceId],
    queryFn: async () => {
      if (!serviceId) return null;
      const { data } = await supabase.from("services").select("default_scope, checklist_items").eq("id", serviceId).single();
      return data;
    },
    enabled: !!serviceId
  });

  const scope = (service?.default_scope as string[]) || [];
  const checklist = (service as any)?.checklist_items || [];

  const hasItems = scope.length > 0 || checklist.length > 0;

  if (!serviceId) {
    return (
      <div className="p-4 border border-dashed border-border rounded-lg text-center">
        <p className="text-[10px] text-foreground/40 italic">Selecione um serviço para visualizar o checklist padrão.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-muted/10 p-4 rounded-xl border border-border/50">
        <Label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40 mb-3 block">
          Estrutura do Serviço
        </Label>
        
        {!hasItems ? (
          <p className="text-[10px] text-foreground/40 italic">Este serviço não possui itens padrão definidos.</p>
        ) : (
          <div className="space-y-4">
            {checklist.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-primary/60 uppercase">Checklist de Execução</p>
                <ul className="space-y-1.5">
                  {checklist.map((item: any, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-[13px] text-foreground/70">
                      <div className="size-4 rounded border border-primary/30 mt-0.5 shrink-0" />
                      {item.text || item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {scope.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-foreground/40 uppercase">Escopo Sugerido</p>
                <ul className="space-y-1.5">
                  {scope.map((item: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-[13px] text-foreground/50">
                      <span className="size-1.5 rounded-full bg-foreground/20 mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
      <p className="text-[10px] text-foreground/40 italic text-center">
        Os itens do checklist serão adicionados automaticamente ao novo Job.
      </p>
    </div>
  );
}
