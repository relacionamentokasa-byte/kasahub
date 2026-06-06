import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

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
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-foreground/50">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

export function NotificationPreferencesTab() {
  const qc = useQueryClient();
  const { data: { user } = {} } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data;
    }
  });

  const { data: prefs, isLoading } = useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user?.id || '')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const mut = useMutation({
    mutationFn: async (patch: any) => {
      const { error } = await supabase
        .from("notification_preferences")
        .update(patch)
        .eq("user_id", user?.id || '');
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast.success("Preferências atualizadas");
    },
    onError: (e: Error) => toast.error(e.message)
  });

  if (isLoading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-surface p-6">
        <h3 className="font-display font-bold mb-4">Categorias de Alerta</h3>
        <ToggleRow 
          title="Menções" 
          description="Quando alguém citar seu @usuario em comentários." 
          checked={prefs?.mentions ?? true}
          onChange={(v) => mut.mutate({ mentions: v })}
        />
        <ToggleRow 
          title="Comentários" 
          description="Novas interações em registros que você participa." 
          checked={prefs?.comments ?? true}
          onChange={(v) => mut.mutate({ comments: v })}
        />
        <ToggleRow 
          title="Jobs e Tarefas" 
          description="Atribuições, prazos e mudanças em jobs." 
          checked={prefs?.jobs ?? true}
          onChange={(v) => mut.mutate({ jobs: v })}
        />
        <ToggleRow 
          title="Aprovações" 
          description="Status de aprovação de clientes e novas peças." 
          checked={prefs?.approvals ?? true}
          onChange={(v) => mut.mutate({ approvals: v })}
        />
        <ToggleRow 
          title="Agenda e Reuniões" 
          description="Lembretes de eventos e compromissos." 
          checked={prefs?.agenda ?? true}
          onChange={(v) => mut.mutate({ agenda: v })}
        />
        <ToggleRow 
          title="Financeiro" 
          description="Vencimentos, recebimentos e inadimplência." 
          checked={prefs?.finance ?? true}
          onChange={(v) => mut.mutate({ finance: v })}
        />
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <h3 className="font-display font-bold mb-4">Canais Externos</h3>
        <ToggleRow 
          title="E-mail" 
          description="Receber resumos e alertas críticos na sua caixa de entrada." 
          checked={prefs?.email_enabled ?? false}
          onChange={(v) => mut.mutate({ email_enabled: v })}
        />
        <ToggleRow 
          title="WhatsApp" 
          description="Receber alertas instantâneos via WhatsApp." 
          checked={prefs?.whatsapp_enabled ?? false}
          onChange={(v) => mut.mutate({ whatsapp_enabled: v })}
        />
        <ToggleRow 
          title="Push Mobile" 
          description="Notificações no seu smartphone Android ou iPhone." 
          checked={prefs?.push_enabled ?? false}
          onChange={(v) => mut.mutate({ push_enabled: v })}
        />
      </div>
    </div>
  );
}
