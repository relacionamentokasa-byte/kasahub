import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const NOTIFICATION_SOUND_URL = "https://lovable-pre-project.lovable.app/lovable-uploads/notification-chime.mp3";

export function useAudioNotifications() {
  const lastProcessedId = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    if (!audioRef.current) {
      audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    }
    
    // Set volume levels
    const volMap = {
      low: 0.3,
      medium: 0.6,
      high: 1.0
    };
    
    audioRef.current.volume = volMap[volume] || 0.6;
    audioRef.current.play().catch(err => {
      console.warn("Audio play blocked by browser. User needs to interact with page first.", err);
    });
  };

  useEffect(() => {
    if (!user?.id) return;

    // Real-time listener for new notifications
    const channel = supabase
      .channel(`new-notifications-${user.id}`)
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

          // Sound is enabled by default unless explicitly disabled in prefs
          const soundEnabled = prefs ? prefs.sound_enabled !== false : true;
          
          if (soundEnabled) {
            // Check category specific sound prefs
            let shouldPlay = true;
            const tipo = newNotif.tipo;

            if (prefs) {
              if (tipo === 'mention' && prefs.sound_mentions === false) shouldPlay = false;
              if (tipo === 'approval' && prefs.sound_approvals === false) shouldPlay = false;
              if (tipo === 'job' && prefs.sound_jobs === false) shouldPlay = false;
              if (tipo === 'agenda' && prefs.sound_agenda === false) shouldPlay = false;
            }

            if (shouldPlay) {
              playSound(prefs?.sound_volume as any || 'medium');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, prefs]);

  return { playSound, prefs };
}
