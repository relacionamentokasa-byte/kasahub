import { useState } from "react";
import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Users, Trash2 } from "lucide-react";
import { fetchClients, deleteClient } from "@/lib/ops-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NewClientDialog } from "@/components/clients/NewClientDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({ meta: [{ title: "Clientes — KASA OS" }] }),
  component: ClientesPage,
});

function ClientesPage() {
  const matches = useMatches();
  const isClientDetail = matches.some((match) => match.routeId === "/_authenticated/clientes/$clientId");
  const qc = useQueryClient();
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const delMut = useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = clients.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.company ?? "").toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
  });

  if (isClientDetail) return <Outlet />;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 lg:px-10 pt-6 pb-4 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <span className="text-primary text-[10px] capitalize">
            Operação · Clientes
          </span>
          <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight mt-1">
            Clientes 360°
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="size-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Buscar cliente…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-10 w-64 bg-surface border-border"
            />
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c) => (
              <div key={c.id} className="relative group">
                <Link
                  to="/clientes/$clientId"
                  params={{ clientId: c.id }}
                  className="block bg-surface border border-border rounded-2xl p-5 hover:border-primary/50 transition"
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
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (confirm(`Remover "${c.company || c.name}"? Esta ação não pode ser desfeita.`)) {
                      delMut.mutate(c.id);
                    }
                  }}
                  className="absolute top-3 right-3 p-2 rounded-md text-destructive opacity-60 hover:opacity-100 hover:bg-destructive/10 transition"
                  aria-label="Excluir cliente"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <NewClientDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
