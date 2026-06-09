import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useCalendarRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Inscreve para mudanças na tabela calendar_events
    const calendarChannel = supabase
      .channel("calendar_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "calendar_events",
        },
        (payload) => {
          console.log("Realtime calendar event update:", payload);
          // Invalida todos os queries de calendário para forçar refetch
          queryClient.invalidateQueries({ queryKey: ["calendar"] });
          queryClient.invalidateQueries({ queryKey: ["calendar-week"] });
          queryClient.invalidateQueries({ queryKey: ["calendar-day"] });
          queryClient.invalidateQueries({ queryKey: ["calendar-list"] });
          
          if (payload.eventType === 'INSERT') {
            toast.info("Novo evento adicionado à agenda");
          } else if (payload.eventType === 'UPDATE') {
            toast.info("Evento da agenda atualizado");
          } else if (payload.eventType === 'DELETE') {
            toast.info("Evento removido da agenda");
          }
        }
      )
      .subscribe();

    // Inscreve para mudanças na tabela jobs (prazos finais)
    const jobsChannel = supabase
      .channel("jobs_calendar_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jobs",
        },
        (payload) => {
          console.log("Realtime job update for calendar:", payload);
          // Jobs também afetam o calendário (deadlines/tasks)
          queryClient.invalidateQueries({ queryKey: ["calendar"] });
          queryClient.invalidateQueries({ queryKey: ["calendar-week"] });
          queryClient.invalidateQueries({ queryKey: ["calendar-day"] });
          queryClient.invalidateQueries({ queryKey: ["calendar-list"] });
          
          // Se for uma atualização de prazo, avisar
          if (payload.eventType === 'UPDATE') {
            const oldJob = payload.old as any;
            const newJob = payload.new as any;
            if (oldJob.due_date !== newJob.due_date) {
              toast.info(`Prazo do job "${newJob.title}" atualizado`);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(calendarChannel);
      supabase.removeChannel(jobsChannel);
    };
  }, [queryClient]);
}
