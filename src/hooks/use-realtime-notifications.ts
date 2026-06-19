import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
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
import React from "react";
import { criticalBus, playCriticalSound, startTitleFlash } from "@/lib/critical-notification-bus";
import { navigateToNotificationLink } from "@/lib/notification-navigation";

const NOTIFICATION_SOUND_URL = "https://lovable-pre-project.lovable.app/lovable-uploads/notification-chime.mp3";

const IconForCategory = ({ tipo }: { tipo: string }) => {
  if (tipo === 'critical') return React.createElement(AlertCircle, { className: "size-4 text-rose-500" });
  if (tipo === 'alert') return React.createElement(AlertTriangle, { className: "size-4 text-amber-500" });
  if (tipo === 'mention' || tipo === 'at') return React.createElement(AtSign, { className: "size-4 text-sky-500" });
  if (tipo === 'finance') return React.createElement("span", { className: "text-xs font-bold text-rose-500" }, "$");
  if (tipo === 'job') return React.createElement(Briefcase, { className: "size-4 text-primary" });
  
  return React.createElement(Info, { className: "size-4 text-primary" });
};

export function useRealtimeNotifications() {
  const lastProcessedId = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: { user } = {} } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data;
    }
  });

  const { data: prefs } = useQuery({
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

  const playSound = (volume: 'low' | 'medium' | 'high' = 'medium') => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
      }
      
      const volMap = {
        low: 0.3,
        medium: 0.6,
        high: 1.0
      };
      
      audioRef.current.volume = volMap[volume] || 0.6;
      audioRef.current.play().catch(err => {
        // Ignorar erro de autoplay bloqueado
      });
    } catch (e) {
      console.warn("Erro ao reproduzir som:", e);
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    // Real-time listener para novas notificações
    const channel = supabase
      .channel(`global-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotif = payload.new;
          if (newNotif.id === lastProcessedId.current) return;
          lastProcessedId.current = newNotif.id;

          // 1. Invalida as queries para atualizar badge e lista
          qc.invalidateQueries({ queryKey: ["notificacoes"] });

          const tipo = newNotif.tipo;
          const isCritical = tipo === 'mention' || tipo === 'at' || tipo === 'critical' || tipo === 'approval' || tipo === 'assignment';

          if (isCritical) {
            // 2a. Popup central + som marcante + flash no título da aba
            criticalBus.push({
              id: newNotif.id,
              titulo: newNotif.titulo,
              mensagem: newNotif.mensagem,
              tipo: newNotif.tipo,
              link: newNotif.link,
            });

            const soundEnabled = prefs ? prefs.sound_enabled !== false : true;
            let shouldPlay = soundEnabled;
            if (prefs) {
              if (tipo === 'mention' && prefs.sound_mentions === false) shouldPlay = false;
              if (tipo === 'approval' && prefs.sound_approvals === false) shouldPlay = false;
            }
            if (shouldPlay) playCriticalSound();

            if (typeof document !== "undefined" && document.hidden) {
              const prefix = tipo === 'critical' ? '🚨' : tipo === 'approval' ? '✅' : tipo === 'assignment' ? '📌' : '💬';
              startTitleFlash(`${prefix} ${newNotif.titulo}`);
            }
          } else {
            // 2b. Toast normal para tipos não-críticos
            toast(newNotif.titulo, {
              description: newNotif.mensagem,
              duration: 5000,
              icon: React.createElement("div", { className: "size-8 rounded-full bg-primary/10 flex items-center justify-center" },
                React.createElement(IconForCategory, { tipo: newNotif.tipo })
              ),
              action: newNotif.link ? {
                label: "Ver",
                onClick: () => navigateToNotificationLink(navigate, newNotif.link)
              } : undefined,
            });

            const soundEnabled = prefs ? prefs.sound_enabled !== false : true;
            if (soundEnabled) {
              let shouldPlay = true;
              if (prefs) {
                if (tipo === 'job' && prefs.sound_jobs === false) shouldPlay = false;
                if (tipo === 'agenda' && prefs.sound_agenda === false) shouldPlay = false;
              }
              if (shouldPlay) playSound(prefs?.sound_volume as any || 'medium');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, prefs, qc, navigate]);

  return { playSound, prefs };
}
