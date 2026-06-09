import { useMemo, useState } from "react";
import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Users, Trash2, LayoutGrid, List as ListIcon, FileSignature, DollarSign, Clock, ChevronRight } from "lucide-react";
import { fetchClients, fetchJobs, fetchExtraDemands, fetchProjects } from "@/lib/ops-api";
import { fetchContracts, fetchTransactions, brl } from "@/lib/finance-api";
import { fetchProfiles } from "@/lib/profile-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NewClientDialog } from "@/components/clients/NewClientDialog";
import { ClientDetailSheet } from "@/components/clients/ClientDetailSheet";
import { DeleteClientDialog } from "@/components/clients/DeleteClientDialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({ meta: [{ title: "Clientes — KASA HUB" }] }),
  component: ClientesPage,
});

function ClientesPage() {
  const matches = useMatches();
  const isClientDetail = matches.some((match) => match.routeId === "/_authenticated/clientes/$clientId");
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const { data: contracts = [] } = useQuery({ queryKey: ["contracts"], queryFn: () => fetchContracts() });
  const { data: transactions = [] } = useQuery({ queryKey: ["transactions"], queryFn: () => fetchTransactions() });
  const { data: profiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const { data: allJobs = [] } = useQuery({ queryKey: ["jobs"], queryFn: () => fetchJobs() });
  const { data: allDmes = [] } = useQuery({ queryKey: ["extra-demands"], queryFn: () => fetchExtraDemands() });
  const { data: allProjects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => fetchProjects() });
  
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"cards" | "list">(() => {
    if (typeof window === "undefined") return "cards";
    return (localStorage.getItem("clientes:view") as "cards" | "list") || "cards";
  });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function changeView(v: "cards" | "list") {
    setView(v);
    if (typeof window !== "undefined") localStorage.setItem("clientes:view", v);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = clients.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.company ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q)
      );
    });
    return list.sort((a, b) => (a.company || a.name).localeCompare(b.company || b.name));
  }, [clients, query, statusFilter]);

  if (isClientDetail) return <Outlet />;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 sm:px-6 lg:px-10 pt-6 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-primary text-[10px] uppercase font-bold tracking-wider">
            Operação · Clientes
          </span>
          <h1 className="font-display text-2xl lg:text-4xl font-bold tracking-tight mt-1">
            Painel 360°
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none min-w-[120px]">
            <Search className="size-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Buscar…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-11 sm:h-10 w-full sm:w-48 bg-surface border-border"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-11 sm:h-10 flex-1 sm:w-[130px] bg-surface border-border text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="hidden sm:flex rounded-md border border-border bg-surface overflow-hidden h-10">
            <button
              type="button"
              onClick={() => changeView("cards")}
              className={`px-3 grid place-items-center transition ${view === "cards" ? "bg-primary text-primary-foreground" : "text-foreground/60 hover:text-foreground"}`}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => changeView("list")}
              className={`px-3 grid place-items-center transition ${view === "list" ? "bg-primary text-primary-foreground" : "text-foreground/60 hover:text-foreground"}`}
            >
              <ListIcon className="size-4" />
            </button>
          </div>
          <Button
            onClick={() => setOpen(true)}
            className="flex-1 sm:flex-none bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-semibold h-11 sm:h-10 px-5 gap-2"
          >
            <Plus className="size-4 shrink-0" /> Novo
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 pb-10">
        {filtered.length === 0 ? (
          <div className="border border-dashed border-border/60 rounded-2xl p-12 text-center text-foreground/50">
            <Users className="size-8 mx-auto mb-3 text-foreground/30" />
            <p className="text-sm">Nenhum cliente cadastrado ainda.</p>
          </div>
        ) : view === "cards" ? (
          <div className="responsive-grid pb-20 md:pb-0">
            {filtered.map((c) => {
              const clientContracts = contracts.filter((ct) => ct.client_id === c.id && ct.status === "active");
              const monthlyValue = clientContracts.reduce((acc, ct) => acc + Number(ct.monthly_value || 0), 0);
              const mainContract = clientContracts[0];
              const contractLabel = mainContract?.title || "Nenhum contrato";

              const nextTransaction = transactions
                .filter(t => t.client_id === c.id && t.status === "pending" && t.kind === "income" && t.due_date >= new Date().toISOString().slice(0, 10))
                .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
              
              const nextDueDate = nextTransaction?.due_date 
                ? new Date(nextTransaction.due_date).toLocaleDateString("pt-BR")
                : "Não definido";
              
              const clientJobs = allJobs.filter(j => j.client_id === c.id && !j.done_at);
              const clientProjects = allProjects.filter(p => p.client_id === c.id);
              const clientDmes = allDmes.filter(d => d.client_id === c.id && d.status !== 'completed' && d.status !== 'cancelled');

              return (
                <div key={c.id} className="relative group">
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className="text-left w-full block bg-surface border border-border rounded-2xl p-5 hover:border-primary/50 transition h-full"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="size-12 rounded-xl grid place-items-center font-display font-bold text-lg overflow-hidden shrink-0"
                        style={{ background: `${c.brand_primary}22`, color: c.brand_primary ?? "#FFBC45" }}
                      >
                        {c.logo_url ? (
                          <img src={c.logo_url} alt="" className="size-full object-cover" />
                        ) : (
                          (c.company || c.name).charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1 pr-8">
                        <div className="font-display font-semibold truncate group-hover:text-primary transition-colors">{c.company || c.name}</div>
                        <div className="mt-1 text-[10px] capitalize text-foreground/40 font-bold">
                          <span className={c.status === "active" ? "text-emerald-400" : ""}>
                            ● {c.status === "active" ? "Ativo" : c.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs text-foreground/60">
                        <FileSignature className="size-3.5 text-primary/60" />
                        <span className="truncate">{contractLabel}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-foreground/60">
                          <DollarSign className="size-3.5 text-emerald-500/60" />
                          <span className="font-mono-kasa font-bold">{monthlyValue > 0 ? brl(monthlyValue) : "R$ 0,00"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-foreground/40">
                          <Clock className="size-3 text-primary/40" />
                          <span>{nextDueDate}</span>
                        </div>
                      </div>
                      <div className="pt-3 mt-1 border-t border-border/40 grid grid-cols-3 gap-2 text-[10px] text-foreground/40 font-mono-kasa">
                        <div className="flex flex-col">
                          <span className="uppercase text-[8px] opacity-60">Jobs</span>
                          <span className="font-bold text-foreground/70">{clientJobs.length}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="uppercase text-[8px] opacity-60">Projetos</span>
                          <span className="font-bold text-foreground/70">{clientProjects.length}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="uppercase text-[8px] opacity-60">DMEs</span>
                          <span className="font-bold text-foreground/70">{clientDmes.length}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteId(c.id);
                    }}
                    className="absolute top-3 right-3 p-2 rounded-md text-destructive opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-destructive/10 transition"
                    aria-label="Excluir cliente"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] capitalize text-foreground/50 border-b border-border">
                    <th className="px-4 py-3 min-w-[200px]">Cliente</th>
                    <th className="px-4 py-3 w-[100px]">Status</th>
                    <th className="px-4 py-3 min-w-[220px]">Contrato</th>
                    <th className="px-4 py-3 text-right w-[140px]">Valor mensal</th>
                    <th className="px-4 py-3 w-[150px]">Próx. vencimento</th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const clientContracts = contracts.filter((ct) => ct.client_id === c.id && ct.status === "active");
                    const monthlyValue = clientContracts.reduce((acc, ct) => acc + Number(ct.monthly_value || 0), 0);
                    const mainContract = clientContracts[0];
                    const contractLabel = mainContract?.title || "Nenhum contrato";

                    const nextTransaction = transactions
                      .filter(t => t.client_id === c.id && t.status === "pending" && t.kind === "income" && t.due_date >= new Date().toISOString().slice(0, 10))
                      .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
                    
                    const nextDueDate = nextTransaction?.due_date 
                      ? new Date(nextTransaction.due_date).toLocaleDateString("pt-BR")
                      : "Não definido";

                    return (
                      <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-surface-elevated transition group">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setSelectedId(c.id)}
                            className="flex items-center gap-3 min-w-0 text-left w-full"
                          >
                            <div
                              className="size-9 rounded-lg grid place-items-center font-display font-bold text-sm overflow-hidden shrink-0"
                              style={{ background: `${c.brand_primary}22`, color: c.brand_primary ?? "#FFBC45" }}
                            >
                              {c.logo_url ? (
                                <img src={c.logo_url} alt="" className="size-full object-cover" />
                              ) : (
                                (c.company || c.name).charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold truncate group-hover:text-primary transition-colors">{c.company || c.name}</div>
                              {c.email && <div className="text-[11px] text-foreground/50 truncate">{c.email}</div>}
                            </div>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] capitalize px-2 py-1 rounded font-bold ${c.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                            {c.status === "active" ? "Ativo" : c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-foreground/60 text-xs">{contractLabel}</td>
                        <td className="px-4 py-3 text-right text-xs font-mono-kasa font-bold">
                          {monthlyValue > 0 ? brl(monthlyValue) : "R$ 0,00"}
                        </td>
                        <td className="px-4 py-3 text-foreground/60 text-xs">{nextDueDate}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setDeleteId(c.id)}
                            className="p-1.5 rounded-md text-destructive opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-destructive/10 transition"
                            aria-label="Excluir cliente"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-border">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-muted/10"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="size-10 rounded-lg grid place-items-center font-display font-bold text-xs shrink-0"
                      style={{ background: `${c.brand_primary}22`, color: c.brand_primary ?? "#FFBC45" }}
                    >
                      {c.logo_url ? <img src={c.logo_url} className="size-full object-cover rounded-lg" /> : (c.company || c.name).charAt(0)}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold truncate max-w-[180px]">{c.company || c.name}</p>
                      <p className="text-[10px] text-foreground/40 font-bold uppercase">{c.status}</p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-foreground/20" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <NewClientDialog open={open} onOpenChange={setOpen} />
      <ClientDetailSheet
        clientId={selectedId}
        open={selectedId !== null}
        onOpenChange={(v) => { if (!v) setSelectedId(null); }}
      />
      <DeleteClientDialog
        clientId={deleteId}
        open={deleteId !== null}
        onOpenChange={(v) => { if (!v) setDeleteId(null); }}
      />
    </div>
  );
}
