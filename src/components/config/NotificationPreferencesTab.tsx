import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Bell, Volume2, Sparkles, CheckCircle2, MessageSquare, AtSign, CalendarClock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { playStandardNotificationSound } from "@/lib/critical-notification-bus";
import { PushNotificationsCard } from "./PushNotificationsCard";

function PreferenceRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  icon: any;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start sm:items-center justify-between py-4 border-b border-border/60 last:border-0 gap-4 hover:bg-muted/10 px-3 rounded-lg transition-colors">
      <div className="flex items-start sm:items-center gap-3 min-w-0">
        <div className="size-8 rounded-lg bg-muted/40 border border-border/80 flex items-center justify-center text-muted-foreground shrink-0 mt-0.5 sm:mt-0">
          <Icon className="size-4" />
        </div>
        <div className="space-y-0.5">
          <p className="font-medium text-xs sm:text-sm tracking-tight text-foreground">{title}</p>
          <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed max-w-[460px]">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="data-[state=checked]:bg-primary shrink-0 mt-1 sm:mt-0"
      />
    </div>
  );
}

export function NotificationPreferencesTab() {
  const qc = useQueryClient();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    }
  });

  const { data: prefs, isLoading: prefsLoading } = useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notif-prefs-updates-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notification_preferences",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["notification-preferences", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  const mut = useMutation({
    mutationFn: async (patch: any) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { data: existing } = await supabase
        .from("notification_preferences")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("notification_preferences")
          .update(patch)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("notification_preferences")
          .insert({
            user_id: user.id,
            ...patch
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-preferences", user?.id] });
      toast.success("Preferências salvas");
    },
    onError: (e: Error) => {
      toast.error(`Erro ao salvar: ${e.message}`);
    }
  });

  if (userLoading || prefsLoading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center gap-4">
        <Loader2 className="size-8 animate-spin text-primary/40" />
        <p className="text-xs text-muted-foreground font-mono-kasa animate-pulse">Carregando preferências…</p>
      </div>
    );
  }

  const soundEnabled = prefs ? prefs.sound_enabled !== false : true;
  const soundVolume = (prefs?.sound_volume as 'low' | 'medium' | 'high') || 'medium';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 1. Canal Push (Mobile / PWA) */}
      <PushNotificationsCard />

      {/* 2. Sons e Alertas do Navegador */}
      <div className="bg-card border border-border/80 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-5">
          <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <Volume2 className="size-4.5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold tracking-tight text-foreground">
              Sons e Alertas Sonoros
            </h3>
            <p className="text-xs text-muted-foreground">
              Controle de feedback auditivo para alertas em tempo real.
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between py-3 border-b border-border/60">
            <div>
              <p className="text-xs sm:text-sm font-medium text-foreground">Alertas sonoros ativos</p>
              <p className="text-[11px] text-muted-foreground">Tocar som discreto quando novas mensagens e alertas chegarem.</p>
            </div>
            <Switch
              checked={soundEnabled}
              onCheckedChange={(v) => {
                mut.mutate({ sound_enabled: v });
                if (v) playStandardNotificationSound(soundVolume);
              }}
              disabled={mut.isPending}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          {soundEnabled && (
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-xs sm:text-sm font-medium text-foreground">Volume do áudio</p>
                <p className="text-[11px] text-muted-foreground">Intensidade do aviso sonoro.</p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={soundVolume}
                  onValueChange={(val: 'low' | 'medium' | 'high') => {
                    mut.mutate({ sound_volume: val });
                    playStandardNotificationSound(val);
                  }}
                  disabled={mut.isPending}
                >
                  <SelectTrigger className="h-8 text-xs w-32 font-mono-kasa">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low" className="text-xs font-mono-kasa">Baixo</SelectItem>
                    <SelectItem value="medium" className="text-xs font-mono-kasa">Médio</SelectItem>
                    <SelectItem value="high" className="text-xs font-mono-kasa">Alto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Eventos da Plataforma */}
      <div className="bg-card border border-border/80 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-5">
          <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <Bell className="size-4.5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold tracking-tight text-foreground">
              Eventos e Atividades
            </h3>
            <p className="text-xs text-muted-foreground">
              Escolha quais eventos geram notificações no sininho e no centro de alertas.
            </p>
          </div>
        </div>

        <div className="divide-y divide-border/60">
          <PreferenceRow
            icon={Sparkles}
            title="Atribuição de Jobs & Demandas"
            description="Receba alertas ao ser designado como responsável ou participante de um job ou projeto."
            checked={prefs ? (prefs as any).jobs ?? true : true}
            onChange={(v) => mut.mutate({ jobs: v })}
            disabled={mut.isPending}
          />
          <PreferenceRow
            icon={AtSign}
            title="Menções diretas (@)"
            description="Avisos em destaque quando alguém mencionar seu nome em briefings, comentários ou notas."
            checked={prefs ? (prefs as any).mentions ?? true : true}
            onChange={(v) => mut.mutate({ mentions: v })}
            disabled={mut.isPending}
          />
          <PreferenceRow
            icon={CheckCircle2}
            title="Aprovações e Mudanças de Etapa"
            description="Alertas quando materiais forem aprovados pelo cliente ou avançarem no pipeline."
            checked={prefs ? (prefs as any).approvals ?? true : true}
            onChange={(v) => mut.mutate({ approvals: v })}
            disabled={mut.isPending}
          />
          <PreferenceRow
            icon={MessageSquare}
            title="Comentários e Interações"
            description="Novas mensagens e notas em tarefas onde você está envolvido."
            checked={prefs ? (prefs as any).comments ?? true : true}
            onChange={(v) => mut.mutate({ comments: v })}
            disabled={mut.isPending}
          />
          <PreferenceRow
            icon={CalendarClock}
            title="Prazos & Lembretes Preventivos"
            description="Lembretes automáticos de vencimento e datas de entrega programadas."
            checked={prefs ? (prefs as any).agenda ?? true : true}
            onChange={(v) => mut.mutate({ agenda: v })}
            disabled={mut.isPending}
          />
        </div>
      </div>
    </div>
  );
}
