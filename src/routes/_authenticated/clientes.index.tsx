import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Mail, Phone, ExternalLink, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { brl } from "@/lib/utils-format";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { NewClientDialog } from "@/components/clients/NewClientDialog";
import { EditClientDialog } from "@/components/clients/EditClientDialog";
import { DeleteClientDialog } from "@/components/clients/DeleteClientDialog";
import { fetchClients } from "@/lib/ops-api";

export const Route = createFileRoute("/_authenticated/clientes/")({
  head: () => ({ meta: [{ title: "Clientes — KASA HUB" }] }),
  component: ClientsPage,
});

function ClientsPage() {
  const [search, setSearch] = useState("");
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [editClient, setEditClient] = useState<any>(null);
  const [deleteClientId, setDeleteClientId] = useState<string | null>(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients", "with-billing-and-proposals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*, transactions(amount, status, type), proposals(status)")
        .order("company", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredClients = clients.filter((c: any) => 
    (c.name?.toLowerCase().includes(search.toLowerCase())) ||
    (c.company?.toLowerCase().includes(search.toLowerCase())) ||
    (c.email?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto animate-reveal">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <span className="text-primary text-[10px] font-mono-kasa capitalize font-medium">
            Operação · Relacionamento
          </span>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight mt-1">
            Clientes
          </h1>
          <p className="text-foreground/50 text-xs lg:text-sm mt-1">
            Gestão da carteira ativa e parceiros.
          </p>
        </div>
        <Button 
          onClick={() => setNewDialogOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-semibold gap-2 h-11 px-6 shadow-lg shadow-primary/20"
        >
          <Plus className="size-4 shrink-0" /> Novo Cliente
        </Button>
      </header>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground/30" />
          <Input
            placeholder="Buscar por nome ou empresa..."
            className="pl-9 bg-surface border-border rounded-xl h-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="font-mono-kasa text-[10px] uppercase tracking-wider py-4">Cliente / Empresa</TableHead>
              <TableHead className="font-mono-kasa text-[10px] uppercase tracking-wider py-4 hidden md:table-cell">Contato</TableHead>
              <TableHead className="font-mono-kasa text-[10px] uppercase tracking-wider py-4 text-center">Contrato Ativo</TableHead>
              <TableHead className="font-mono-kasa text-[10px] uppercase tracking-wider py-4 text-right">Faturamento</TableHead>
              <TableHead className="font-mono-kasa text-[10px] uppercase tracking-wider py-4 hidden sm:table-cell text-center">Status</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-foreground/40 italic">

                  Carregando clientes...
                </TableCell>
              </TableRow>
            ) : filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-foreground/40 italic">
                  {search ? "Nenhum cliente encontrado para esta busca." : "Nenhum cliente cadastrado."}
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client) => {
                const totalBilling = (client.transactions || [])
                  .filter((t: any) => t.type === 'income' && t.status === 'paid')
                  .reduce((acc: number, t: any) => acc + Number(t.amount || 0), 0);
                
                const hasActiveContract = (client.proposals || [])
                  .some((p: any) => p.status === 'Aprovada');

                return (
                  <TableRow key={client.id} className="group hover:bg-muted/20 transition-colors">
                  <TableCell className="py-4">
                    {/* Link obrigatório para Visão 360 */}
                    <Link 
                      to="/clientes/$clientId"
                      params={{ clientId: client.id }}
                      className="flex items-center gap-3 transition-opacity group-hover:opacity-80"
                    >
                      <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0 border border-primary/20">
                        {client.logo_url ? (
                          <img src={client.logo_url} alt={client.name} className="size-full object-cover rounded-xl" />
                        ) : (
                          (client.company || client.name)?.[0]?.toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate hover:underline hover:text-primary cursor-pointer transition-colors">{client.company || client.name}</div>
                        <div className="text-[10px] text-foreground/40 font-medium truncate uppercase tracking-tight">{client.company ? client.name : "—"}</div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell py-4">
                    <div className="space-y-1">
                      {client.email && (
                        <div className="flex items-center gap-1.5 text-xs text-foreground/60">
                          <Mail className="size-3 shrink-0 text-primary/50" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-foreground/60">
                          <Phone className="size-3 shrink-0 text-primary/50" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-center">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest border-2",
                        hasActiveContract 
                          ? "border-emerald-500/20 text-emerald-500 bg-emerald-500/5" 
                          : "border-foreground/10 text-foreground/40 bg-foreground/5"
                      )}
                    >
                      {hasActiveContract ? 'Sim' : 'Não'}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    <span className={cn(
                      "text-sm font-bold",
                      totalBilling > 0 ? "text-foreground" : "text-foreground/20"
                    )}>
                      {brl(totalBilling)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell py-4 text-center">
                    <Badge 
                      variant="outline" 
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest border-2 ${
                        client.status === 'active' ? 'border-green-500/20 text-green-500 bg-green-500/5' : 
                        client.status === 'paused' ? 'border-amber-500/20 text-amber-500 bg-amber-500/5' : 
                        'border-foreground/10 text-foreground/40 bg-foreground/5'
                      }`}
                    >
                      {client.status === 'active' ? 'Ativo' : client.status === 'paused' ? 'Pausado' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right py-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem asChild>
                          <Link to="/clientes/$clientId" params={{ clientId: client.id }} className="flex items-center gap-2 cursor-pointer">
                            <ExternalLink className="size-4" /> Ver detalhes
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setEditClient(client)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Pencil className="size-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setDeleteClientId(client.id)}
                          className="flex items-center gap-2 cursor-pointer text-destructive"
                        >
                          <Trash2 className="size-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                 </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <NewClientDialog 
        open={newDialogOpen} 
        onOpenChange={setNewDialogOpen} 
      />

      {editClient && (
        <EditClientDialog
          client={editClient}
          open={!!editClient}
          onOpenChange={(open) => !open && setEditClient(null)}
        />
      )}

      <DeleteClientDialog
        clientId={deleteClientId}
        open={!!deleteClientId}
        onOpenChange={(open) => !open && setDeleteClientId(null)}
      />
    </div>
  );
}
