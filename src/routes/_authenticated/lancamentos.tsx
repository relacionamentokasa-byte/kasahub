import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Rocket, Calendar, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listLaunchGrids, createLaunchGrid, deleteLaunchGrid } from "@/lib/launch-grids-api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/lancamentos")({
  component: LancamentosPage,
});

function LancamentosPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data: grids = [], isLoading } = useQuery({
    queryKey: ["launch-grids"],
    queryFn: listLaunchGrids,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-min"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name, company").order("name");
      return data || [];
    },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteLaunchGrid(id),
    onSuccess: () => {
      toast.success("Grid removido");
      qc.invalidateQueries({ queryKey: ["launch-grids"] });
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const active = grids.filter((g) => g.status === "active");
  const archived = grids.filter((g) => g.status !== "active");

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Rocket className="size-7 text-primary" /> Grid de Lançamento
          </h1>
          <p className="text-sm text-foreground/60 mt-1">
            Acompanhe lançamentos de produtos por cliente. O cliente vê automaticamente no portal dele.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="size-4" /> Novo Grid</Button>
          </DialogTrigger>
          <NewGridDialog clients={clients} onClose={() => setOpen(false)} onCreated={(id) => {
            setOpen(false);
            navigate({ to: "/lancamentos/$gridId", params: { gridId: id } });
          }} />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-foreground/50">Carregando...</div>
      ) : active.length === 0 && archived.length === 0 ? (
        <Card className="p-12 text-center">
          <Rocket className="size-12 text-foreground/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum lançamento ainda</h3>
          <p className="text-sm text-foreground/60 mb-4">
            Crie o primeiro grid de lançamento para um cliente (ex: Kaksa Beauty).
          </p>
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="size-4" /> Criar Grid
          </Button>
        </Card>
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/60 mb-3">Ativos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map((g) => (
                  <GridCard key={g.id} grid={g} onDelete={() => delMut.mutate(g.id)} />
                ))}
              </div>
            </section>
          )}
          {archived.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/60 mb-3">Arquivados</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {archived.map((g) => (
                  <GridCard key={g.id} grid={g} onDelete={() => delMut.mutate(g.id)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function GridCard({ grid, onDelete }: { grid: any; onDelete: () => void }) {
  const clientName = grid.clients?.company || grid.clients?.name || "Cliente";
  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-shadow relative">
      <Button
        variant="ghost"
        size="icon"
        className="size-7 text-foreground/40 hover:text-destructive absolute top-2 right-2 z-10 bg-background/80 backdrop-blur"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (confirm(`Remover "${grid.title}"? Os produtos serão excluídos.`)) onDelete();
        }}
      >
        <Trash2 className="size-3.5" />
      </Button>
      <Link to="/lancamentos/$gridId" params={{ gridId: grid.id }} className="block">
        {grid.cover_url ? (
          <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${grid.cover_url})` }} />
        ) : (
          <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Rocket className="size-10 text-primary/40" />
          </div>
        )}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-base leading-tight">{grid.title}</h3>
            {grid.status !== "active" && <Badge variant="outline" className="text-xs">arquivado</Badge>}
          </div>
          <div className="text-xs text-foreground/60 mb-2">{clientName}</div>
          {grid.launch_date && (
            <div className="text-xs text-foreground/60 flex items-center gap-1">
              <Calendar className="size-3" />
              {format(new Date(grid.launch_date), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
            </div>
          )}
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-primary font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
              Abrir <ArrowRight className="size-3" />
            </span>
          </div>
        </div>
      </Link>
    </Card>
  );
}


function NewGridDialog({
  clients, onClose, onCreated,
}: { clients: any[]; onClose: () => void; onCreated: (id: string) => void }) {
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [launchDate, setLaunchDate] = useState("");

  const mut = useMutation({
    mutationFn: () => createLaunchGrid({
      client_id: clientId,
      title,
      description: description || null,
      launch_date: launchDate || null,
    }),
    onSuccess: (g) => {
      toast.success("Grid criado! Etapas padrão foram adicionadas.");
      onCreated(g.id);
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Novo Grid de Lançamento</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Cliente *</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Título *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Lançamento Verão 2026" />
        </div>
        <div>
          <Label>Descrição</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <div>
          <Label>Data prevista do lançamento</Label>
          <Input type="date" value={launchDate} onChange={(e) => setLaunchDate(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => mut.mutate()} disabled={!clientId || !title || mut.isPending}>
          {mut.isPending ? "Criando..." : "Criar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
