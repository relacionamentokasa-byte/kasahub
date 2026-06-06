import { useMemo, useState } from "react";
import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Users, Trash2, LayoutGrid, List as ListIcon, ArrowUpDown, FileSignature, DollarSign, Clock, User } from "lucide-react";
import { fetchClients, fetchJobs, fetchExtraDemands } from "@/lib/ops-api";
import { fetchContracts, fetchTransactions, brl } from "@/lib/finance-api";
import { fetchProfiles } from "@/lib/profile-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NewClientDialog } from "@/components/clients/NewClientDialog";
import { ClientDetailSheet } from "@/components/clients/ClientDetailSheet";
import { DeleteClientDialog } from "@/components/clients/DeleteClientDialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";


type SortKey = "name" | "status" | "created_at";

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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"cards" | "list">(() => {
    if (typeof window === "undefined") return "cards";
    return (localStorage.getItem("clientes:view") as "cards" | "list") || "cards";
  });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("name");
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
    list = [...list].sort((a, b) => {
      if (sortBy === "name") return (a.company || a.name).localeCompare(b.company || b.name);
      if (sortBy === "status") return (a.status ?? "").localeCompare(b.status ?? "");
      return (b.created_at ?? "").localeCompare(a.created_at ?? "");
    });
    return list;
  }, [clients, query, statusFilter, sortBy]);

  if (isClientDetail) return <Outlet />;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 lg:px-10 pt-6 pb-4 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <span className="text-primary text-[10px] capitalize">
            Operação · Clientes
          </span>
          <h1 className="font-display text-2xl lg:text-4xl font-bold tracking-tight mt-1">
            Painel do Cliente 360°
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="size-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Buscar cliente…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-10 w-56 bg-surface border-border"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-[130px] bg-surface border-border text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="h-10 w-[150px] bg-surface border-border text-xs gap-1">
              <ArrowUpDown className="size-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nome (A-Z)</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="created_at">Mais recentes</SelectItem>
            </SelectContent>
          </Select>
          <div className="inline-flex rounded-md border border-border bg-surface overflow-hidden h-10">
            <button
              type="button"
              onClick={() => changeView("cards")}
              aria-label="Visualização em cards"
              className={`px-3 grid place-items-center transition ${view === "cards" ? "bg-primary text-primary-foreground" : "text-foreground/60 hover:text-foreground"}`}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => changeView("list")}
              aria-label="Visualização em lista"
              className={`px-3 grid place-items-center transition ${view === "list" ? "bg-primary text-primary-foreground" : "text-foreground/60 hover:text-foreground"}`}
            >
              <ListIcon className="size-4" />
            </button>
          </div>
          <Button
            onClick={() => setOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-semibold h-10 px-5 gap-2"
          >
            <Plus className="size-4" /> Novo cliente
          </Button>
        </div>
      </div>



      <div className="flex-1 overflow-y-auto px-6 lg:px-10 pb-10">
        {filtered.length === 0 ? (
          <div className="border border-dashed border-border/60 rounded-2xl p-12 text-center text-foreground/50">
            <Users className="size-8 mx-auto mb-3 text-foreground/30" />
            <p className="text-sm">Nenhum cliente cadastrado ainda.</p>
          </div>
        ) : view === "cards" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-20 md:pb-0">
            {filtered.map((c) => (
              <div key={c.id} className="relative group">
                <button
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className="text-left w-full block bg-surface border border-border rounded-2xl p-5 hover:border-primary/50 transition"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="size-12 rounded-xl grid place-items-center font-display font-bold text-lg overflow-hidden"
                      style={{ background: `${c.brand_primary}22`, color: c.brand_primary ?? "#FFBC45" }}
                    >
                      {c.logo_url ? (
                        <img src={c.logo_url} alt="" className="size-full object-cover" />
                      ) : (
                        (c.company || c.name).charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pr-8">
                      <div className="font-display font-semibold truncate">{c.company || c.name}</div>
                      {c.company && c.name && (
                        <div className="text-xs text-foreground/50 truncate">{c.name}</div>
                      )}
                    </div>
                  </div>
                  {c.email && (
                    <div className="text-xs text-foreground/50 truncate">{c.email}</div>
                  )}
                  <div className="mt-3 text-[10px] capitalize text-foreground/40">
                    {c.status === "active" ? "● Ativo" : c.status}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDeleteId(c.id);
                  }}
                  className="absolute top-3 right-3 p-2 rounded-md text-destructive opacity-60 hover:opacity-100 hover:bg-destructive/10 transition"
                  aria-label="Excluir cliente"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            {/* Desktop list */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] capitalize text-foreground/50 border-b border-border">
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Responsável</th>
                    <th className="px-4 py-3">Contrato</th>
                    <th className="px-4 py-3 text-right">Valor mensal</th>
                    <th className="px-4 py-3">Próx. vencimento</th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-surface-elevated transition">
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
                            <div className="font-semibold truncate hover:text-primary">{c.company || c.name}</div>
                            {c.email && <div className="text-[11px] text-foreground/50 truncate">{c.email}</div>}
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] capitalize px-2 py-1 rounded ${c.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                          {c.status === "active" ? "Ativo" : c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground/60">—</td>
                      <td className="px-4 py-3 text-foreground/60">—</td>
                      <td className="px-4 py-3 text-right text-foreground/60">—</td>
                      <td className="px-4 py-3 text-foreground/60">—</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setDeleteId(c.id)}
                          className="p-1.5 rounded-md text-destructive opacity-60 hover:opacity-100 hover:bg-destructive/10 transition"
                          aria-label="Excluir cliente"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <ul className="md:hidden divide-y divide-border">
              {filtered.map((c) => (
                <li key={c.id} className="relative">
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className="flex items-center gap-3 p-4 pr-12 text-left w-full"
                  >
                    <div
                      className="size-10 rounded-lg grid place-items-center font-display font-bold text-sm overflow-hidden shrink-0"
                      style={{ background: `${c.brand_primary}22`, color: c.brand_primary ?? "#FFBC45" }}
                    >
                      {c.logo_url ? (
                        <img src={c.logo_url} alt="" className="size-full object-cover" />
                      ) : (
                        (c.company || c.name).charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{c.company || c.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] capitalize px-1.5 py-0.5 rounded ${c.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                          {c.status === "active" ? "Ativo" : c.status}
                        </span>
                        {c.email && <span className="text-[11px] text-foreground/50 truncate">{c.email}</span>}
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(c.id)}
                    className="absolute top-1/2 -translate-y-1/2 right-3 p-2 rounded-md text-destructive opacity-60 hover:opacity-100 hover:bg-destructive/10 transition"
                    aria-label="Excluir cliente"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
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
