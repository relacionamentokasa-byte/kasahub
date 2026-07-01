import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listEditorialPosts, type EditorialPost,
  SOCIAL_LABEL, CONTENT_TYPE_LABEL, STATUS_LABEL,
  type SocialNetwork, type EditorialContentType, type EditorialStatus,
} from "@/lib/editorial-api";
import { getMonthStrategy, upsertMonthStrategy } from "@/lib/editorial-strategy-api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Download, FileText, Share2, LayoutGrid, Activity, Sparkles, Save } from "lucide-react";
import { EditorialMonthGrid } from "@/components/editorial/EditorialMonthGrid";
import { EditorialWeekList } from "@/components/editorial/EditorialWeekList";
import { EditorialFeedGrid } from "@/components/editorial/EditorialFeedGrid";
import { EditorialList } from "@/components/editorial/EditorialList";
import { EditorialTimeline } from "@/components/editorial/EditorialTimeline";
import { EditorialPostDialog } from "@/components/editorial/EditorialPostDialog";
import { SocialIcon } from "@/components/editorial/SocialIcon";
import { exportEditorialPostsPDF, exportEditorialPostsCSV } from "@/lib/editorial-export";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export function ClientEditorialSection({ clientId, clientName, clientLogoUrl }: { clientId: string; clientName: string; clientLogoUrl?: string | null }) {
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "feed" | "list" | "timeline">("feed");
  const [filters, setFilters] = useState<{ social?: SocialNetwork; ct?: EditorialContentType; status?: EditorialStatus }>({});
  const [dialog, setDialog] = useState<{ open: boolean; post?: EditorialPost | null; date?: Date | null }>({ open: false });
  const [strategy, setStrategy] = useState("");
  const qc = useQueryClient();

  const year = cursor.getFullYear();
  const month = cursor.getMonth() + 1;

  const { data: strategyData = "" } = useQuery({
    queryKey: ["editorial-strategy", clientId, year, month],
    queryFn: () => getMonthStrategy(clientId, year, month),
    enabled: !!clientId,
  });

  useEffect(() => { setStrategy(strategyData); }, [strategyData]);

  const saveStrategy = useMutation({
    mutationFn: () => upsertMonthStrategy(clientId, year, month, strategy),
    onSuccess: () => {
      toast.success("Estratégia salva");
      qc.invalidateQueries({ queryKey: ["editorial-strategy", clientId, year, month] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
  });


  const range = useMemo(() => {
    if (view === "month" || view === "feed" || view === "list") {
      const from = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1).toISOString();
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
    <div className="space-y-6">
      <div className="rounded-2xl border border-foreground/10 bg-card/40 backdrop-blur-sm shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset] px-3 py-2 flex flex-wrap items-center gap-2">
        <Select value={filters.social ?? "all"} onValueChange={(v) => setFilters(f => ({ ...f, social: v === "all" ? undefined : v as SocialNetwork }))}>
          <SelectTrigger className={`h-9 rounded-full border-foreground/10 bg-transparent hover:bg-foreground/5 transition-colors px-3 gap-2 w-auto min-w-[8.5rem] ${filters.social ? "text-primary border-primary/40 bg-primary/5" : "text-foreground/70"}`}>
            <Share2 className="size-3.5 opacity-70" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas redes</SelectItem>
            {Object.entries(SOCIAL_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                <span className="inline-flex items-center gap-2">
                  <SocialIcon network={k as SocialNetwork} size={16} /> {v}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.ct ?? "all"} onValueChange={(v) => setFilters(f => ({ ...f, ct: v === "all" ? undefined : v as EditorialContentType }))}>
          <SelectTrigger className={`h-9 rounded-full border-foreground/10 bg-transparent hover:bg-foreground/5 transition-colors px-3 gap-2 w-auto min-w-[8rem] ${filters.ct ? "text-primary border-primary/40 bg-primary/5" : "text-foreground/70"}`}>
            <LayoutGrid className="size-3.5 opacity-70" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            {Object.entries(CONTENT_TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.status ?? "all"} onValueChange={(v) => setFilters(f => ({ ...f, status: v === "all" ? undefined : v as EditorialStatus }))}>
          <SelectTrigger className={`h-9 rounded-full border-foreground/10 bg-transparent hover:bg-foreground/5 transition-colors px-3 gap-2 w-auto min-w-[8rem] ${filters.status ? "text-primary border-primary/40 bg-primary/5" : "text-foreground/70"}`}>
            <Activity className="size-3.5 opacity-70" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 rounded-full text-foreground/70 hover:text-foreground hover:bg-foreground/5" disabled={posts.length === 0}>
                <Download className="size-4 mr-1.5" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportEditorialPostsPDF({ clientName, cursor, posts })}>
                <FileText className="size-4 mr-2" /> PDF (para o cliente)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportEditorialPostsCSV({ clientName, cursor, posts })}>
                <Download className="size-4 mr-2" /> CSV (planilha)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="sm"
            className="h-9 rounded-full px-4"
            onClick={() => setDialog({ open: true, post: null, date: cursor })}
          >
            <Plus className="size-4 mr-1.5" /> Novo post
          </Button>
        </div>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as any)}>
        <TabsList>
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="list">Lista</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="month">Mensal</TabsTrigger>
          <TabsTrigger value="week">Semanal</TabsTrigger>
        </TabsList>
        <TabsContent value="feed" className="mt-4">
          <EditorialFeedGrid posts={posts} onSelectPost={(p) => setDialog({ open: true, post: p })} />
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          <EditorialList posts={posts} onSelectPost={(p) => setDialog({ open: true, post: p })} />
        </TabsContent>
        <TabsContent value="timeline" className="mt-4">
          <EditorialTimeline posts={posts} cursor={cursor} onCursorChange={setCursor} onSelectPost={(p) => setDialog({ open: true, post: p })} />
        </TabsContent>
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
          <EditorialWeekList posts={posts} cursor={cursor} onCursorChange={setCursor} onSelectPost={(p) => setDialog({ open: true, post: p })} />
        </TabsContent>
      </Tabs>

      <EditorialPostDialog
        open={dialog.open}
        onOpenChange={(o) => setDialog(d => ({ ...d, open: o }))}
        clientId={clientId}
        post={dialog.post}
        defaultDate={dialog.date}
      />
    </div>
  );
}
