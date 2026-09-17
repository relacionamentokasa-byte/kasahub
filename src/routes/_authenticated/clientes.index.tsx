import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Mail, Phone, ExternalLink, MoreVertical, Pencil, Trash2, Globe, Eye, EyeOff } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { StorageImage } from "@/components/ui/storage-image";

export const Route = createFileRoute("/_authenticated/clientes/")({
  head: () => ({ meta: [{ title: "Clientes — KASA HUB" }] }),
  component: ClientsPage,
});

function ClientsPage() {
  const [search, setSearch] = useState("");
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [editClient, setEditClient] = useState<any>(null);
  const [deleteClientId, setDeleteClientId] = useState<string | null>(null);
  const [showBilling, setShowBilling] = useState(false);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients", "with-billing-and-proposals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*, transactions(amount, status, type), proposals(status)");
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredClients = clients
    .filter((c: any) =>
      (c.name?.toLowerCase().includes(search.toLowerCase())) ||
      (c.company?.toLowerCase().includes(search.toLowerCase())) ||
      (c.email?.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a: any, b: any) => {
      const key = (c: any) =>
        (c.company?.trim() || c.name?.trim() || "")
          .toString()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
      return key(a).localeCompare(key(b), "pt-BR", { sensitivity: "base" });
    });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 w-full mx-auto animate-reveal">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <span className="text-[10px] uppercase font-mono-kasa tracking-wider text-muted-foreground block font-medium">
            Operação · Relacionamento
          </span>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight mt-0.5">
            Clientes
          </h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            Gestão da carteira ativa e parceiros.
          </p>
        </div>
        <Button
          onClick={() => setNewDialogOpen(true)}
          className="bg-foreground text-background hover:bg-foreground/90 rounded-md font-medium h-8 px-3 text-xs gap-1.5 font-mono-kasa shadow-xs self-start sm:self-auto"
        >
          <Plus className="size-3.5 shrink-0" /> Novo Cliente
        </Button>
      </header>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou empresa..."
            className="pl-8 bg-card border-border/60 rounded-md h-8 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tabela Desktop */}
      <div className="hidden md:block bg-card border border-border/60 rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-b border-border/60 hover:bg-transparent">
              <TableHead className="font-mono-kasa text-[10px] uppercase tracking-wider py-2.5 h-auto text-muted-foreground font-medium">Cliente / Empresa</TableHead>
              <TableHead className="font-mono-kasa text-[10px] uppercase tracking-wider py-2.5 h-auto text-muted-foreground font-medium hidden md:table-cell">Contato</TableHead>
              <TableHead className="font-mono-kasa text-[10px] uppercase tracking-wider py-2.5 h-auto text-muted-foreground font-medium text-center">Contrato Ativo</TableHead>
              <TableHead className="font-mono-kasa text-[10px] uppercase tracking-wider py-2.5 h-auto text-muted-foreground font-medium text-right">
                <button
                  type="button"
                  onClick={() => setShowBilling((v) => !v)}
                  className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                  aria-label={showBilling ? "Ocultar faturamento" : "Mostrar faturamento"}
                  title={showBilling ? "Ocultar faturamento" : "Mostrar faturamento"}
                >
                  Faturamento
                  {showBilling ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                </button>
              </TableHead>
              <TableHead className="font-mono-kasa text-[10px] uppercase tracking-wider py-2.5 h-auto text-muted-foreground font-medium hidden sm:table-cell text-center">Status</TableHead>
              <TableHead className="w-[80px] py-2.5 h-auto"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/60">
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-xs italic">
                  Carregando clientes...
                </TableCell>
              </TableRow>
            ) : filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-xs italic">
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
                  <TableRow key={client.id} className="group hover:bg-muted/20 transition-colors border-border/60">
                  <TableCell className="py-2.5">
                    {/* Link obrigatório para Visão 360 */}
                    <Link
                      to="/clientes/$clientId"
                      params={{ clientId: client.id }}
                      className="flex items-center gap-2.5 transition-opacity group-hover:opacity-80"
                    >
                      <div className="size-7 rounded bg-muted flex items-center justify-center text-foreground font-mono-kasa text-xs font-bold shrink-0 border border-border/60">
                        {client.logo_url ? (
                          <StorageImage src={client.logo_url} alt={client.name} className="size-full object-cover rounded" />
                        ) : (
                          (client.company || client.name)?.[0]?.toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-xs truncate hover:underline hover:text-primary cursor-pointer transition-colors text-foreground">{client.company || client.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono-kasa truncate uppercase tracking-tight">{client.company ? client.name : "—"}</div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell py-2.5">
                    <div className="space-y-0.5">
                      {client.email && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono-kasa text-[11px]">
                          <Mail className="size-3 shrink-0 text-muted-foreground/70" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono-kasa text-[11px]">
                          <Phone className="size-3 shrink-0 text-muted-foreground/70" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 text-center">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded px-2 py-0 text-[10px] font-mono-kasa font-semibold uppercase tracking-wider border",
                        hasActiveContract
                          ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
                          : "border-border/60 text-muted-foreground bg-muted/20"
                      )}
                    >
                      {hasActiveContract ? 'Sim' : 'Não'}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2.5 text-right font-mono-kasa tabular-nums">
                    <span className={cn(
                      "text-xs font-semibold",
                      !showBilling
                        ? "text-muted-foreground tracking-widest select-none"
                        : totalBilling > 0 ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {showBilling ? brl(totalBilling) : "••••••"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell py-2.5 text-center">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded px-2 py-0 text-[10px] font-mono-kasa font-semibold uppercase tracking-wider border",
                        client.status === 'active' ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5' :
                        client.status === 'paused' ? 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5' :
                        'border-border/60 text-muted-foreground bg-muted/20'
                      )}
                    >
                      {client.status === 'active' ? 'Ativo' : client.status === 'paused' ? 'Pausado' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      {client.portal_slug && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                asChild
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                              >
                                <a
                                  href={`/minha-kasa/${client.portal_slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label="Abrir portal do cliente"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Globe className="size-3.5" />
                                </a>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Abrir portal do cliente</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground">
                            <MoreVertical className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 text-xs font-mono-kasa">
                          <DropdownMenuItem asChild>
                            <Link to="/clientes/$clientId" params={{ clientId: client.id }} className="flex items-center gap-2 cursor-pointer text-xs">
                              <ExternalLink className="size-3.5" /> Ver detalhes
                            </Link>
                          </DropdownMenuItem>
                          {client.portal_slug && (
                            <DropdownMenuItem asChild>
                              <a
                                href={`/minha-kasa/${client.portal_slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 cursor-pointer text-xs"
                              >
                                <Globe className="size-4" /> Abrir portal
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => setEditClient(client)}
                            className="flex items-center gap-2 cursor-pointer text-xs"
                          >
                            <Pencil className="size-3.5" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteClientId(client.id)}
                            className="flex items-center gap-2 cursor-pointer text-destructive text-xs"
                          >
                            <Trash2 className="size-3.5" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                 </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Cards Mobile */}
      <div className="md:hidden space-y-2.5">
        {isLoading ? (
          <div className="rounded-xl border border-border/60 bg-card p-6 text-center text-muted-foreground text-xs italic">
            Carregando clientes...
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-card p-6 text-center text-muted-foreground text-xs italic">
            {search ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado."}
          </div>
        ) : (
          filteredClients.map((client) => {
            const hasActiveContract = (client.proposals || [])
              .some((p: any) => p.status === 'Aprovada');
            const totalBilling = (client.transactions || [])
              .filter((t: any) => t.type === 'income' && t.status === 'paid')
              .reduce((acc: number, t: any) => acc + Number(t.amount || 0), 0);

            return (
              <div
                key={client.id}
                className="bg-card border border-border/60 rounded-xl p-3.5 flex flex-col gap-3 shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    to="/clientes/$clientId"
                    params={{ clientId: client.id }}
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    <div className="size-9 rounded-lg bg-muted flex items-center justify-center text-foreground font-mono-kasa text-xs font-bold shrink-0 border border-border/60">
                      {client.logo_url ? (
                        <StorageImage src={client.logo_url} alt={client.name} className="size-full object-cover rounded-lg" />
                      ) : (
                        (client.company || client.name)?.[0]?.toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-xs truncate text-foreground">
                        {client.company || client.name}
                      </div>
                      {client.company && (
                        <div className="text-[10px] text-muted-foreground font-mono-kasa truncate">
                          {client.name}
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded px-2 py-0.5 text-[10px] font-mono-kasa font-semibold uppercase tracking-wider border",
                        hasActiveContract
                          ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
                          : "border-border/60 text-muted-foreground bg-muted/20"
                      )}
                    >
                      {hasActiveContract ? 'Contrato' : 'Sem contrato'}
                    </Badge>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 text-xs font-mono-kasa">
                        <DropdownMenuItem asChild>
                          <Link to="/clientes/$clientId" params={{ clientId: client.id }} className="flex items-center gap-2 cursor-pointer text-xs">
                            <ExternalLink className="size-3.5" /> Ver detalhes
                          </Link>
                        </DropdownMenuItem>
                        {client.portal_slug && (
                          <DropdownMenuItem asChild>
                            <a
                              href={`/minha-kasa/${client.portal_slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 cursor-pointer text-xs"
                            >
                              <Globe className="size-3.5" /> Abrir portal
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => setEditClient(client)}
                          className="flex items-center gap-2 cursor-pointer text-xs"
                        >
                          <Pencil className="size-3.5" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteClientId(client.id)}
                          className="flex items-center gap-2 cursor-pointer text-destructive text-xs"
                        >
                          <Trash2 className="size-3.5" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] font-mono-kasa text-muted-foreground">
                  <div className="flex items-center gap-3">
                    {client.phone && (
                      <a
                        href={`https://wa.me/${client.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        <Phone className="size-3 text-emerald-500" />
                        <span>{client.phone}</span>
                      </a>
                    )}
                    {client.email && !client.phone && (
                      <span className="truncate max-w-[180px]">{client.email}</span>
                    )}
                  </div>

                  {totalBilling > 0 && (
                    <span className="font-semibold text-foreground tabular-nums">
                      {brl(totalBilling)}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
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
