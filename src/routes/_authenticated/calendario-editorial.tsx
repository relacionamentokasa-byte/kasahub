import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchClients } from "@/lib/ops-api";
import {
  listEditorialPosts, type EditorialPost,
  SOCIAL_LABEL, CONTENT_TYPE_LABEL, STATUS_LABEL,
  type SocialNetwork, type EditorialContentType, type EditorialStatus,
} from "@/lib/editorial-api";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Download, FileText } from "lucide-react";
import { EditorialMonthGrid } from "@/components/editorial/EditorialMonthGrid";
import { EditorialWeekList } from "@/components/editorial/EditorialWeekList";
import { EditorialPostDialog } from "@/components/editorial/EditorialPostDialog";
import { exportEditorialPostsPDF, exportEditorialPostsCSV } from "@/lib/editorial-export";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated/calendario-editorial")({
  head: () => ({ meta: [{ title: "Calendário Editorial — KASA HUB" }] }),
  component: EditorialPage,
});

function EditorialPage() {
  const [clientId, setClientId] = useState<string>("");
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("month");
  const [filters, setFilters] = useState<{ social?: SocialNetwork; ct?: EditorialContentType; status?: EditorialStatus }>({});
  const [dialog, setDialog] = useState<{ open: boolean; post?: EditorialPost | null; date?: Date | null }>({ open: false });

  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });

  const range = useMemo(() => {
    if (view === "month") {
      const from = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 15).toISOString();
      const to = new Date(cursor.getFullYear(), cursor.getMonth() + 2, 1).toISOString();
      return { from, to };
    } else {
      const s = new Date(cursor); s.setDate(s.getDate() - s.getDay() - 7);
      const e = new Date(cursor); e.setDate(e.getDate() + 14);
      return { from: s.toISOString(), to: e.toISOString() };
    }
  }, [view, cursor]);

  const { data: posts = [] } = useQuery({
    queryKey: ["editorial-posts", clientId, range.from, range.to, filters],
    queryFn: () => listEditorialPosts({
      clientId,
      from: range.from,
      to: range.to,
      social: filters.social,
      contentType: filters.ct,
      status: filters.status,
    }),
    enabled: !!clientId,
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <p className="text-xs font-mono-kasa text-foreground/40 uppercase">Operação · Conteúdo</p>
        <h1 className="font-display text-3xl mt-1">Calendário Editorial</h1>
        <p className="text-foreground/60 text-sm mt-1">Planeje e organize os posts de cada cliente nas redes sociais.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger className="bg-background w-64"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
          <SelectContent>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.social ?? "all"} onValueChange={(v) => setFilters(f => ({ ...f, social: v === "all" ? undefined : v as SocialNetwork }))}>
          <SelectTrigger className="bg-background w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas redes</SelectItem>
            {Object.entries(SOCIAL_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.ct ?? "all"} onValueChange={(v) => setFilters(f => ({ ...f, ct: v === "all" ? undefined : v as EditorialContentType }))}>
          <SelectTrigger className="bg-background w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            {Object.entries(CONTENT_TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.status ?? "all"} onValueChange={(v) => setFilters(f => ({ ...f, status: v === "all" ? undefined : v as EditorialStatus }))}>
          <SelectTrigger className="bg-background w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="ml-auto flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={!clientId || posts.length === 0}>
                <Download className="size-4 mr-1" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => exportEditorialPostsPDF({
                  clientName: clients.find(c => c.id === clientId)?.name ?? "Cliente",
                  cursor, posts,
                })}
              >
                <FileText className="size-4 mr-2" /> PDF (para o cliente)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => exportEditorialPostsCSV({
                  clientName: clients.find(c => c.id === clientId)?.name ?? "Cliente",
                  cursor, posts,
                })}
              >
                <Download className="size-4 mr-2" /> CSV (planilha)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            disabled={!clientId}
            onClick={() => setDialog({ open: true, post: null, date: cursor })}
          >
            <Plus className="size-4 mr-1" /> Novo post
          </Button>
        </div>
      </div>

      {!clientId ? (
        <div className="border border-dashed border-border rounded-2xl p-16 text-center text-foreground/50">
          Selecione um cliente para visualizar o calendário.
        </div>
      ) : (
        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <TabsList>
            <TabsTrigger value="month">Mensal</TabsTrigger>
            <TabsTrigger value="week">Semanal</TabsTrigger>
          </TabsList>
          <TabsContent value="month" className="mt-4">
            <EditorialMonthGrid
              posts={posts}
              cursor={cursor}
              onCursorChange={setCursor}
              onSelectPost={(p) => setDialog({ open: true, post: p })}
              onCreateOnDay={(d) => setDialog({ open: true, post: null, date: d })}
            />
          </TabsContent>
          <TabsContent value="week" className="mt-4">
            <EditorialWeekList
              posts={posts}
              cursor={cursor}
              onCursorChange={setCursor}
              onSelectPost={(p) => setDialog({ open: true, post: p })}
            />
          </TabsContent>
        </Tabs>
      )}

      {clientId && (
        <EditorialPostDialog
          open={dialog.open}
          onOpenChange={(o) => setDialog(d => ({ ...d, open: o }))}
          clientId={clientId}
          post={dialog.post}
          defaultDate={dialog.date}
        />
      )}
    </div>
  );
}
