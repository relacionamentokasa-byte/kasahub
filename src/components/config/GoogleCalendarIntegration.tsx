import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  fetchGoogleCalendarConnection, 
  upsertGoogleCalendarConnection, 
  disconnectGoogleCalendar 
} from "@/lib/google-calendar-api";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Calendar as CalendarIcon, 
  RefreshCw, 
  Unlink, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function GoogleCalendarIntegration() {
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);

  const { data: connection, isLoading } = useQuery({
    queryKey: ["google-calendar-connection"],
    queryFn: fetchGoogleCalendarConnection,
  });

  const updateMutation = useMutation({
    mutationFn: upsertGoogleCalendarConnection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-calendar-connection"] });
      toast.success("Configurações atualizadas com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao atualizar configurações.");
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectGoogleCalendar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-calendar-connection"] });
      toast.success("Integração desconectada.");
    },
  });

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // In a real app with standard_connectors, we would call the tool
      // Here we simulate the connection flow
      await updateMutation.mutateAsync({
        google_account_email: "usuario@gmail.com", // This would come from the OAuth flow
        is_sync_enabled: true,
        is_bidirectional: true
      });
      toast.success("Google Calendar conectado!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao conectar com Google Calendar.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSyncNow = async () => {
    toast.info("Sincronização iniciada...");
    try {
      // Trigger edge function for sync
      const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
        body: { action: "sync-all" }
      });
      if (error) throw error;
      toast.success("Sincronização concluída!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao sincronizar eventos.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-background/40">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-primary/10 text-primary">
            <CalendarIcon className="size-6" />
          </div>
          <div>
            <h3 className="text-lg font-display">Google Calendar</h3>
            <p className="text-sm text-foreground/60">
              Sincronize compromissos, jobs e prazos do KASA HUB com sua agenda Google.
            </p>
          </div>
        </div>
        
        {connection ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-mono-kasa text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
              <CheckCircle2 className="size-3" /> Conectado
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => disconnectMutation.mutate()}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/20"
            >
              <Unlink className="size-4 mr-2" /> Desconectar
            </Button>
          </div>
        ) : (
          <Button onClick={handleConnect} disabled={isConnecting}>
            {isConnecting ? <Loader2 className="size-4 mr-2 animate-spin" /> : <ExternalLink className="size-4 mr-2" />}
            Conectar Conta Google
          </Button>
        )}
      </div>

      {connection && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4 p-6 rounded-xl border border-border bg-surface">
            <h4 className="font-display text-lg">Configurações de Sincronização</h4>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sincronização Automática</Label>
                  <p className="text-xs text-foreground/50">Atualiza eventos em tempo real.</p>
                </div>
                <Switch 
                  checked={connection.is_sync_enabled} 
                  onCheckedChange={(val) => updateMutation.mutate({ is_sync_enabled: val })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sincronização Bidirecional</Label>
                  <p className="text-xs text-foreground/50">Eventos do Google aparecem no KASA HUB.</p>
                </div>
                <Switch 
                  checked={connection.is_bidirectional} 
                  onCheckedChange={(val) => updateMutation.mutate({ is_bidirectional: val })}
                />
              </div>

              <div className="pt-4 border-t border-border">
                <Button 
                  variant="secondary" 
                  className="w-full" 
                  onClick={handleSyncNow}
                >
                  <RefreshCw className="size-4 mr-2" /> Forçar Sincronização Agora
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-6 rounded-xl border border-border bg-surface">
            <h4 className="font-display text-lg">Informações da Conta</h4>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-foreground/60">Email:</span>
                <span className="font-mono-kasa">{connection.google_account_email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground/60">Calendário:</span>
                <span className="font-mono-kasa">{connection.selected_calendar_id === 'primary' ? 'Principal' : connection.selected_calendar_id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground/60">Última Pull:</span>
                <span className="font-mono-kasa text-xs">
                  {connection.last_pulled_at ? new Date(connection.last_pulled_at).toLocaleString() : 'Nunca'}
                </span>
              </div>
              
              <div className="mt-4 p-3 rounded bg-amber-500/10 border border-amber-500/20 flex gap-3">
                <AlertCircle className="size-5 text-amber-500 shrink-0" />
                <p className="text-[10px] text-amber-200/70 leading-relaxed">
                  Eventos marcados como "Privados" no Google Calendar não são importados por motivos de segurança e privacidade.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
