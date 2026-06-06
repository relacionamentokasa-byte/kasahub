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
  const [isSyncing, setIsSyncing] = useState(false);
  const [emailInput, setEmailInput] = useState("");


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
      setEmailInput("");
    },
  });

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes("@")) {
      toast.error("Por favor, insira um e-mail válido.");
      return;
    }

    setIsConnecting(true);
    try {
      await updateMutation.mutateAsync({
        google_account_email: emailInput,
        is_sync_enabled: true,
        is_bidirectional: true,
        selected_calendar_id: 'primary'
      });
      toast.success("Conta Google vinculada com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao vincular conta Google.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    const syncToast = toast.info("Sincronização iniciada...", { duration: 10000 });
    try {
      console.log("Chamando edge function de sincronização...");
      const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
        body: { action: "sync-all" }
      });
      
      if (error) {
        console.error("Erro invoke:", error);
        throw error;
      }
      
      if (data?.error) {
        console.error("Erro retornado pela função:", data.error);
        throw new Error(data.error);
      }
      
      await queryClient.invalidateQueries({ queryKey: ["google-calendar-connection"] });
      toast.dismiss(syncToast);
      toast.success(`Sincronização concluída! ${data?.count || 0} eventos processados.`);
    } catch (error: any) {
      console.error("Erro na sincronização:", error);
      toast.dismiss(syncToast);
      toast.error(`Erro ao sincronizar: ${error.message || 'Verifique sua conexão'}`);
    } finally {
      setIsSyncing(false);
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
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-mono-kasa text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                <CheckCircle2 className="size-3" /> Sincronização Ativa
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
          </div>
        ) : (
          <form onSubmit={handleConnect} className="flex items-center gap-2">
            <div className="relative">
              <input
                type="email"
                placeholder="seu-email@gmail.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="h-9 w-64 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                required
              />
            </div>
            <Button type="submit" disabled={isConnecting}>
              {isConnecting ? <Loader2 className="size-4 mr-2 animate-spin" /> : <ExternalLink className="size-4 mr-2" />}
              Vincular Conta
            </Button>
          </form>
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
                  disabled={isSyncing}

                >
                    {isSyncing ? (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="size-4 mr-2" />
                    )}
                    {isSyncing ? "Sincronizando..." : "Forçar Sincronização Agora"}

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
