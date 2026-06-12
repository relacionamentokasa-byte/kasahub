import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Modal "+ Novo Projeto" — reconstruído do zero (clean code).
 * - SEM useEffect (zero risco de loop infinito / erro #185)
 * - Apenas 2 campos: Nome do Projeto e Cliente
 * - Insert direto + invalidateQueries + fechamento do modal
 */
export function NewProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", "select-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, company")
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Informe o nome do projeto.");
      return;
    }
    if (!clientId) {
      toast.error("Selecione um cliente.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        client_id: clientId,
        status: "active",
        type: "special",
      };
      console.log("Payload do Projeto:", payload);

      const { error } = await supabase.from("projects").insert([payload]);

      if (error) {
        console.error("ERRO CRÍTICO AO CRIAR PROJETO:", error);
        toast.error(`Erro no Banco: ${error.message}`);
        return;
      }

      toast.success("Projeto criado com sucesso!");
      setName("");
      setClientId("");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    } catch (e) {
      console.error("Erro na criação do projeto:", e);
      toast.error(e instanceof Error ? e.message : "Erro inesperado ao criar projeto.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Novo Projeto</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome do Projeto</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Gestão de Redes Sociais"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <Select value={clientId || undefined} onValueChange={(v) => setClientId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.company || c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => handleCreate()}
            disabled={isSaving || !name.trim() || !clientId}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSaving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Criar Projeto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
