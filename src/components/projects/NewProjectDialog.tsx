import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProject } from "@/lib/ops-api";
import { toast } from "sonner";
import { FolderGit2, Loader2 } from "lucide-react";

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients?: Array<{ id: string; name?: string | null; company?: string | null }>;
  defaultClientId?: string;
}

export function NewProjectDialog({
  open,
  onOpenChange,
  clients: clientsProp,
  defaultClientId,
}: NewProjectDialogProps) {
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState(defaultClientId || "");
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  // Fallback para buscar clientes se não forem passados como prop
  const { data: fetchedClients = [] } = useQuery({
    queryKey: ["clients", "for-new-project-dialog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, company")
        .eq("status", "active")
        .order("name", { ascending: true });
      if (error) return [];
      return data || [];
    },
    enabled: !clientsProp || clientsProp.length === 0,
  });

  const clients = clientsProp && clientsProp.length > 0 ? clientsProp : fetchedClients;

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
      await createProject({
        name: name.trim(),
        client_id: clientId,
        status: "active",
        type: "special",
      });

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
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-semibold tracking-tight">
            <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <FolderGit2 className="size-5" />
            </div>
            <span>Novo Projeto</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Cadastre um novo projeto operacional para agrupar jobs e demandas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 pt-1">
          <div className="space-y-1">
            <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
              Nome do Projeto *
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Gestão de Redes Sociais ou Campanha de Verão"
              className="h-9 text-xs font-medium"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
              Cliente Responsável *
            </Label>
            <Select value={clientId || undefined} onValueChange={(v) => setClientId(v)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs cursor-pointer">
                    {c.company || c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-9 text-xs"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => handleCreate()}
            disabled={isSaving || !name.trim() || !clientId}
            size="sm"
            className="h-9 text-xs font-medium gap-1.5"
          >
            {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <FolderGit2 className="size-3.5" />}
            Criar Projeto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
