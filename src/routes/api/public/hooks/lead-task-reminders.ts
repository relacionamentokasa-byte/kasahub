import { createFileRoute } from "@tanstack/react-router";
import {
  isLeadActive,
  leadTaskDedupeKey,
  saoPauloDay,
  type LeadStatusShape,
} from "@/lib/notifications/lead-activity";

export const Route = createFileRoute("/api/public/hooks/lead-task-reminders")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const now = new Date();
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        const day = saoPauloDay(now);
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);

        // Pending tasks due today or overdue, joined with their lead and stage
        const { data: tasks, error } = await supabaseAdmin
          .from("lead_tasks")
          .select("id, lead_id, title, due_date, assigned_to, leads!inner(id, name, won_at, lost_reason, lead_stages(is_won, is_lost))")
          .eq("status", "pending")
          .not("assigned_to", "is", null)
          .not("due_date", "is", null)
          .lte("due_date", endOfDay.toISOString());

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }

        const rows = (tasks ?? [])
          .filter((t) => isLeadActive(t.leads as unknown as LeadStatusShape))
          .map((t) => {
            const overdue = new Date(t.due_date as string).getTime() < startOfDay.getTime();
            const leadName = (t.leads as unknown as { name: string | null }).name ?? "Lead";
            return {
              user_id: t.assigned_to as string,
              titulo: overdue ? "Tarefa atrasada" : "Tarefa para hoje",
              mensagem: `${overdue ? "Atrasada: " : ""}${t.title} · ${leadName}`,
              tipo: "lead_task",
              link: `/crm?leadId=${t.lead_id}&taskId=${t.id}`,
              dedupe_key: leadTaskDedupeKey(t.id, day),
            };
          });

        let inserted = 0;
        if (rows.length) {
          // Unique dedupe_key: one reminder per task per day, even under concurrent calls
          const { data, error: insErr } = await supabaseAdmin
            .from("notificacoes")
            .upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true })
            .select("id");
          if (insErr) {
            return new Response(JSON.stringify({ error: insErr.message }), {
              status: 500,
              headers: { "content-type": "application/json" },
            });
          }
          inserted = data?.length ?? 0;
        }

        return new Response(
          JSON.stringify({ ok: true, sent: inserted }),
          { headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});
