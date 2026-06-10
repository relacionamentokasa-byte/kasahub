import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook para adicionar sincronização em tempo real a qualquer query do TanStack Query.
 * 
 * @param table Nome da tabela no Supabase
 * @param queryKeys Array de queryKeys que devem ser invalidadas quando houver mudanças
 * @param filter Filtro opcional do Postgres (ex: "user_id=eq.123")
 */
export function useRealtimeSync(
  table: string, 
  queryKeys: any[][], 
  filter?: string
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`rt-${table}-${Math.random().toString(36).substring(7)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: table,
          filter: filter,
        },
        (payload) => {
          console.log(`Realtime update for ${table}:`, payload);
          // Invalida todas as queries fornecidas
          queryKeys.forEach(key => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, queryKeys, filter, queryClient]);
}
