import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { Filter, List } from "lucide-react";

interface Props {
  partnerId: string;
}

export function CommissionHistory({ partnerId }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <List className="size-5 text-primary" />
          <h3 className="font-display text-lg font-bold uppercase tracking-tight">Painel de Comissões</h3>
        </div>
      </div>

      <Card className="p-10 text-center text-foreground/40 italic">
        Histórico de comissões simplificado em breve.
      </Card>
    </div>
  );
}
