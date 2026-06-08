import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  fetchNotifications, 
  markAsRead, 
  markAllAsRead, 
  archiveNotification, 
  type Notification 
} from "@/lib/notifications-api";
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Archive, 
  ExternalLink, 
  Inbox,
  AlertCircle,
  AlertTriangle,
  Info,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

export function NotificationCenter() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
  });

  useEffect(() => {
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel("notification-changes")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            qc.invalidateQueries({ queryKey: ["notifications"] });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupSubscription();
  }, [qc]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const readMut = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const readAllMut = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Todas as notificações marcadas como lidas");
    },
  });

  const archiveMut = useMutation({
    mutationFn: archiveNotification,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const handleAction = (n: Notification) => {
    if (!n.is_read) readMut.mutate(n.id);
    if (n.link) {
      navigate({ to: n.link as any });
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'critical': return <AlertCircle className="size-4 text-rose-500" />;
      case 'alert': return <AlertTriangle className="size-4 text-amber-500" />;
      default: return <Info className="size-4 text-primary" />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 text-foreground/60 hover:text-foreground transition-colors group">
          <Bell className="size-5 group-hover:scale-110 transition-transform" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 size-4 bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center rounded-full ring-2 ring-background animate-in zoom-in">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0 bg-surface border-border shadow-2xl" align="end" sideOffset={8}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold">Notificações</h3>
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono-kasa">
              {unreadCount} novas
            </span>
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-[10px] uppercase font-bold tracking-wider gap-1.5"
              onClick={() => readAllMut.mutate()}
              disabled={readAllMut.isPending}
            >
              <CheckCheck className="size-3" /> Ler tudo
            </Button>
          )}
        </div>

        <Tabs defaultValue="unread" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-10 px-4">
            <TabsTrigger value="unread" className="text-[10px] uppercase font-bold tracking-widest data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-10">
              Não lidas
            </TabsTrigger>
            <TabsTrigger value="all" className="text-[10px] uppercase font-bold tracking-widest data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-10">
              Todas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unread" className="m-0">
            <NotificationList 
              items={notifications.filter(n => !n.is_read)} 
              isLoading={isLoading} 
              onAction={handleAction}
              onArchive={(id) => archiveMut.mutate(id)}
              emptyText="Você está em dia!"
            />
          </TabsContent>
          <TabsContent value="all" className="m-0">
            <NotificationList 
              items={notifications} 
              isLoading={isLoading} 
              onAction={handleAction}
              onArchive={(id) => archiveMut.mutate(id)}
              emptyText="Nenhuma notificação por aqui."
            />
          </TabsContent>
        </Tabs>
        
        <div className="p-2 border-t border-border bg-muted/30">
          <Button variant="ghost" className="w-full h-8 text-[10px] uppercase font-bold text-foreground/40 hover:text-primary" onClick={() => navigate({ to: "/config?tab=notifications" as any })}>
            Configurações de Notificação
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NotificationList({ 
  items, 
  isLoading, 
  onAction, 
  onArchive,
  emptyText 
}: { 
  items: Notification[], 
  isLoading: boolean, 
  onAction: (n: Notification) => void,
  onArchive: (id: string) => void,
  emptyText: string
}) {
  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Clock className="size-6 text-foreground/20 animate-pulse" />
        <p className="text-xs text-foreground/30 font-mono-kasa">Carregando...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3 text-center px-8">
        <Inbox className="size-8 text-foreground/10" />
        <p className="text-sm text-foreground/40 font-medium">{emptyText}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="divide-y divide-border">
        {items.map((n) => (
          <div 
            key={n.id} 
            className={cn(
              "p-4 hover:bg-muted/50 transition-colors cursor-pointer group relative",
              !n.is_read && "bg-primary/5"
            )}
            onClick={() => onAction(n)}
          >
            {!n.is_read && (
              <span className="absolute left-1 top-1/2 -translate-y-1/2 size-1.5 bg-primary rounded-full" />
            )}
            <div className="flex gap-3">
              <div className="size-8 rounded-full bg-surface border border-border flex items-center justify-center shrink-0">
                <IconForCategory category={n.category} type={n.type} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className={cn("text-xs font-bold truncate", !n.is_read ? "text-foreground" : "text-foreground/70")}>
                    {n.title}
                  </p>
                  <span className="text-[9px] text-foreground/30 whitespace-nowrap font-mono-kasa">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
                <p className="text-xs text-foreground/50 line-clamp-2 leading-relaxed">
                  {n.description}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-primary/60">
                    {n.origin_type || 'Sistema'}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        onArchive(n.id);
                      }}
                    >
                      <Archive className="size-3 text-foreground/40 hover:text-rose-500" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <ExternalLink className="size-3 text-foreground/40 hover:text-primary" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function IconForCategory({ category, type }: { category: string, type: string }) {
  if (type === 'critical') return <AlertCircle className="size-3.5 text-rose-500" />;
  if (type === 'alert') return <AlertTriangle className="size-3.5 text-amber-500" />;
  
  switch (category) {
    case 'mention': return <span className="text-[10px] font-bold text-sky-500">@</span>;
    case 'job': return <Check className="size-3.5 text-emerald-500" />;
    case 'approval': return <CheckCheck className="size-3.5 text-amber-500" />;
    case 'finance': return <span className="text-[10px] font-bold text-rose-500">$</span>;
    case 'agenda': return <Clock className="size-3.5 text-primary" />;
    default: return <Info className="size-3.5 text-primary" />;
  }
}
