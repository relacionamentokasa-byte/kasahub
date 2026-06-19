import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  fetchNotifications, 
  marcarComoLida, 
  marcarTodasComoLidas, 
  type Notificacao 
} from "@/lib/notifications-api";
import { 
  Bell, 
  CheckCheck, 
  Inbox,
  AlertCircle,
  AlertTriangle,
  Info,
  Clock,
  Briefcase,
  AtSign
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
import { navigateToNotificationLink } from "@/lib/notification-navigation";

export function NotificationCenter() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notificacoes"],
    queryFn: fetchNotifications,
  });

  // A subscrição em tempo real agora é gerenciada globalmente no useRealtimeNotifications
  // para evitar duplicidade de toasts e sons.

  const unreadCount = notifications.filter(n => !n.lido).length;

  const readMut = useMutation({
    mutationFn: marcarComoLida,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notificacoes"] }),
  });

  const readAllMut = useMutation({
    mutationFn: marcarTodasComoLidas,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notificacoes"] });
      toast.success("Todas as notificações marcadas como lidas");
    },
  });

  const handleAction = (n: Notificacao) => {
    if (!n.lido) readMut.mutate(n.id);
    navigateToNotificationLink(navigate, n.link);
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
              items={notifications.filter(n => !n.lido)} 
              isLoading={isLoading} 
              onAction={handleAction}
              emptyText="Você está em dia!"
            />
          </TabsContent>
          <TabsContent value="all" className="m-0">
            <NotificationList 
              items={notifications} 
              isLoading={isLoading} 
              onAction={handleAction}
              emptyText="Nenhuma notificação por aqui."
            />
          </TabsContent>
        </Tabs>
        
        <div className="p-2 border-t border-border bg-muted/30">
          <Button variant="ghost" className="w-full h-8 text-[10px] uppercase font-bold text-foreground/40 hover:text-primary" onClick={() => navigate({ to: "/config?tab=notifications" as any })}>
            Configurações
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
  emptyText 
}: { 
  items: Notificacao[], 
  isLoading: boolean, 
  onAction: (n: Notificacao) => void,
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
              !n.lido && "bg-primary/5"
            )}
            onClick={() => onAction(n)}
          >
            {!n.lido && (
              <span className="absolute left-1 top-1/2 -translate-y-1/2 size-1.5 bg-primary rounded-full" />
            )}
            <div className="flex gap-3">
              <div className="shrink-0">
                <div className="size-8 rounded-full bg-surface border border-border flex items-center justify-center">
                  <IconForCategory tipo={n.tipo} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className={cn("text-xs font-bold truncate", !n.lido ? "text-foreground" : "text-foreground/70")}>
                    {n.titulo}
                  </p>
                  <span className="text-[9px] text-foreground/30 whitespace-nowrap font-mono-kasa">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
                <p className="text-xs text-foreground/50 line-clamp-2 leading-relaxed">
                  {n.mensagem}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function IconForCategory({ tipo }: { tipo: string }) {
  if (tipo === 'critical') return <AlertCircle className="size-3.5 text-rose-500" />;
  if (tipo === 'alert') return <AlertTriangle className="size-3.5 text-amber-500" />;
  if (tipo === 'mention' || tipo === 'at') return <AtSign className="size-3.5 text-sky-500" />;
  if (tipo === 'finance') return <span className="text-[10px] font-bold text-rose-500">$</span>;
  if (tipo === 'job') return <Briefcase className="size-3.5 text-primary" />;
  
  return <Info className="size-3.5 text-primary" />;
}
