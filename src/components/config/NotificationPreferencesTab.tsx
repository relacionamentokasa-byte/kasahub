import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, AlertTriangle, Phone, Mail, Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProfile } from "@/lib/profile-api";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  
  const { data: { user } = {} } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data;
    }
  });

  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: fetchMyProfile,
    enabled: !!user?.id
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
      const hasPhone = profile?.phone && profile.phone.length > 5;
      const hasEmail = user?.email;

      if (patch.whatsapp_enabled && !hasPhone) {
        throw new Error("MISSING_PHONE");
      }

      const { data: existing } = await supabase
        .from("notification_preferences")
        .select("user_id")
        .eq("user_id", user?.id || '')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("notification_preferences")
          .update(patch)
          .eq("user_id", user?.id || '');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("notification_preferences")
          .insert({
            user_id: user?.id,
            ...patch
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast.success("Preferências atualizadas");
    },
    onError: (e: Error) => {
      if (e.message === "MISSING_PHONE") {
        toast.error("Telefone não cadastrado", {
          description: "Cadastre seu WhatsApp no perfil para ativar este canal."
        });
      } else {
        toast.error(e.message);
      }
    }
  });

  const handleTestNotification = async () => {
    if (!user?.id) return;
    
    toast.info("Enviando teste...", { description: "Verifique sua central e canais ativos." });
    
    try {
      const { error } = await supabase.functions.invoke("send-test-notification", {
        body: { userId: user.id }
      });
      
      if (error) throw error;
      toast.success("Teste enviado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar teste.");
    }
  };

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
        
        {(!profile?.phone || profile.phone.length < 5) && (
          <div className="mb-4 p-3 rounded bg-amber-500/10 border border-amber-500/20 flex gap-3 items-start">
            <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-amber-200">WhatsApp e Push desativados</p>
              <p className="text-[10px] text-amber-200/70 leading-relaxed">
                Detectamos que seu telefone não está cadastrado. Vá em "Meu Perfil" para inserir seu WhatsApp.
              </p>
            </div>
          </div>
        )}

        <ToggleRow 
          title="E-mail" 
          description={`Receber em: ${user?.email || 'e-mail não encontrado'}`}
          checked={prefs?.email_enabled ?? false}
          onChange={(v) => mut.mutate({ email_enabled: v })}
        />
        <ToggleRow 
          title="WhatsApp" 
          description={profile?.phone ? `Enviar para: ${profile.phone}` : "Requer telefone no perfil"} 
          checked={prefs?.whatsapp_enabled ?? false}
          onChange={(v) => mut.mutate({ whatsapp_enabled: v })}
          disabled={!profile?.phone}
        />
        <ToggleRow 
          title="Push Mobile" 
          description="Notificações no seu smartphone Android ou iPhone." 
          checked={prefs?.push_enabled ?? false}
          onChange={(v) => mut.mutate({ push_enabled: v })}
          disabled={!profile?.phone}
        />

        <div className="mt-8 pt-6 border-t border-border space-y-4">
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium">Teste Prático</h4>
            <p className="text-xs text-foreground/50">
              Clique no botão abaixo para simular uma notificação e validar seus canais ativos.
            </p>
          </div>
          <Button 
            variant="outline" 
            className="w-full md:w-auto"
            onClick={handleTestNotification}
          >
            <Bell className="size-4 mr-2" />
            Enviar Notificação de Teste
          </Button>
        </div>
      </div>
    </div>
  );
}
