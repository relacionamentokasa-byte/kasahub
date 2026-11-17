import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/lead-task-reminders")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const now = new Date();
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        // Pending tasks due today or overdue, with a responsible user
        const { data: tasks, error } = await supabaseAdmin
          .from("lead_tasks")
          .select(
            "id, lead_id, title, due_date, assigned_to, leads!inner(name, won_at, lost_reason, lead_stages!inner(is_won, is_lost))",
          )
          .eq("status", "pending")
          .not("assigned_to", "is", null)
          .not("due_date", "is", null)
          .lte("due_date", endOfDay.toISOString())
          .is("leads.won_at", null)
          .is("leads.lost_reason", null)
          .eq("leads.lead_stages.is_won", false)
          .eq("leads.lead_stages.is_lost", false);

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { "content-type": "application/json" } },
          );
        }

        if (!tasks?.length) {
          return new Response(
            JSON.stringify({ ok: true, sent: 0 }),
            { headers: { "content-type": "application/json" } },
          );
        }

        // Deduplicate today's notifications by task identity, not mutable text
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const { data: alreadySent } = await supabaseAdmin
          .from("notificacoes")
          .select("link")
          .eq("tipo", "lead_task")
          .gte("created_at", startOfDay.toISOString());
        const sentLinks = new Set((alreadySent ?? []).map((n) => n.link));

        const rows: {
          user_id: string;
          titulo: string;
          mensagem: string;
          tipo: string;
          link: string;
        }[] = [];

        for (const t of tasks) {
          const overdue =
            t.due_date && new Date(t.due_date).getTime() < startOfDay.getTime();
          const lead = Array.isArray(t.leads) ? t.leads[0] : t.leads;
          const leadName = lead?.name ?? "Lead";
          const link = `/crm?leadId=${t.lead_id}&taskId=${t.id}`;
          const mensagem = `${overdue ? "Atrasada: " : ""}${t.title} · ${leadName}`;
          if (sentLinks.has(link)) continue;
          rows.push({
            user_id: t.assigned_to as string,
            titulo: overdue ? "Tarefa atrasada" : "Tarefa para hoje",
            mensagem,
            tipo: "lead_task",
            link,
          });
        }

        if (rows.length) {
          await supabaseAdmin.from("notificacoes").insert(rows);
        }

        return new Response(
          JSON.stringify({ ok: true, sent: rows.length }),
          { headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});
