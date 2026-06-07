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
      const { data } = await supabase.from("services").select("default_scope").eq("id", serviceId).single();
      return data;
    },
    enabled: !!serviceId
  });

  const schema = (service?.default_scope as string[]) || [];

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
        <Label className="text-[10px] font-bold uppercase tracking-wider text-foreground/40 mb-3 block">Checklist Sugerido do Serviço</Label>
        {schema.length === 0 ? (
          <p className="text-[10px] text-foreground/40 italic">Este serviço não possui itens de checklist padrão definidos.</p>
        ) : (
          <ul className="space-y-2">
            {schema.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-foreground/70">
                <span className="size-1.5 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-[10px] text-foreground/40 italic text-center">Os itens acima servem como base para a execução deste Job.</p>
    </div>
  );
}
