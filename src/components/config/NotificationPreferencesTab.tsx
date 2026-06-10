import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Bell, Shield, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border/50 last:border-0 hover:bg-muted/5 transition-colors px-2 rounded-lg">
      <div className="space-y-1">
        <p className="font-bold text-sm tracking-tight">{title}</p>
        <p className="text-xs text-foreground/50 leading-relaxed max-w-[400px]">{description}</p>
      </div>
      <Switch 
        checked={checked} 
        onCheckedChange={onChange} 
        disabled={disabled}
        className="data-[state=checked]:bg-primary"
      />
    </div>
  );
}

export function NotificationPreferencesTab() {
  const qc = useQueryClient();

  // Get current user
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    }
  });

  // Get preferences
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

  // Realtime subscription setup
  useEffect(() => {
    if (!user?.id) return;

    let channel: any;

    const setupSubscription = async () => {
      // Clean up previous channel
      if (channel) {
        await supabase.removeChannel(channel);
      }

      channel = supabase
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
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user?.id, qc]);

  // Update preferences mutation
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
      toast.success("Preferências salvas com sucesso!");
    },
    onError: (e: Error) => {
      toast.error(`Erro ao salvar: ${e.message}`);
    }
  });

  if (userLoading || prefsLoading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center gap-4">
        <Loader2 className="size-8 animate-spin text-primary/40" />
        <p className="text-sm text-foreground/40 font-mono-kasa animate-pulse">Carregando preferências...</p>
      </div>
    );
  }

  const notificationTypes = [
    {
      key: "jobs",
      title: "Atribuição de Job",
      description: "Notifica quando uma nova tarefa for atribuída a você ou quando houver mudanças críticas em jobs que você participa."
    },
    {
      key: "mentions",
      title: "Menções",
      description: "Alertas imediatos quando alguém mencionar seu @usuário em qualquer parte do sistema (comentários, notas, briefings)."
    },
    {
      key: "comments",
      title: "Comentários",
      description: "Fique por dentro de novas interações e discussões em tarefas ou projetos onde você está envolvido."
    },
    {
      key: "approvals",
      title: "Mudança de Status",
      description: "Receba avisos quando o status de uma tarefa mudar, mantendo o fluxo de trabalho sempre atualizado."
    },
    {
      key: "agenda",
      title: "Prazo Próximo",
      description: "Lembretes preventivos automáticos (1 dia antes) para garantir que nenhuma entrega importante seja esquecida."
    }
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-surface border border-border rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Bell className="size-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight">Notificações da Plataforma</h3>
            <p className="text-sm text-foreground/50">Gerencie como e quando você deseja ser notificado no sistema.</p>
          </div>
        </div>

        <div className="space-y-2">
          {notificationTypes.map((type) => (
            <ToggleRow 
              key={type.key}
              title={type.title}
              description={type.description}
              checked={prefs ? (prefs as any)[type.key] ?? true : true}
              onChange={(v) => mut.mutate({ [type.key]: v })}
              disabled={mut.isPending}
            />
          ))}
        </div>

        <div className="mt-10 p-4 bg-muted/30 border border-border/50 rounded-xl flex gap-3">
          <Info className="size-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-foreground/70">Tempo Real Ativado</p>
            <p className="text-[11px] text-foreground/50 leading-relaxed">
              As alterações são aplicadas instantaneamente a todos os seus dispositivos conectados através do Supabase Realtime.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-surface/50 border border-dashed border-border rounded-2xl p-6 flex items-center justify-between gap-6">
        <div className="flex items-center gap-3 text-foreground/40">
          <Shield className="size-5" />
          <p className="text-xs font-medium">As preferências são privadas e vinculadas exclusivamente à sua conta de usuário.</p>
        </div>
      </div>
    </div>
  );
}
