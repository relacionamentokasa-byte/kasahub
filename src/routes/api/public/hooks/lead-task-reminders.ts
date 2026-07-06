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
          .select("id, lead_id, title, due_date, assigned_to")
          .eq("status", "pending")
          .not("assigned_to", "is", null)
          .not("due_date", "is", null)
          .lte("due_date", endOfDay.toISOString());

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

        // Fetch lead names in one shot
        const leadIds = Array.from(new Set(tasks.map((t) => t.lead_id)));
        const { data: leads } = await supabaseAdmin
          .from("leads")
          .select("id, name")
          .in("id", leadIds);
        const leadName = new Map((leads ?? []).map((l) => [l.id, l.name]));

        // Deduplicate today's notifications by (assigned_to, task id) via titulo prefix
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const { data: alreadySent } = await supabaseAdmin
          .from("notificacoes")
          .select("user_id, mensagem")
          .eq("tipo", "lead_task")
          .gte("created_at", startOfDay.toISOString());
        const sentKey = new Set(
          (alreadySent ?? []).map((n) => `${n.user_id}::${n.mensagem}`),
        );

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
          const mensagem = `${overdue ? "Atrasada: " : ""}${t.title} · ${leadName.get(t.lead_id) ?? "Lead"}`;
          const key = `${t.assigned_to}::${mensagem}`;
          if (sentKey.has(key)) continue;
          rows.push({
            user_id: t.assigned_to as string,
            titulo: overdue ? "Tarefa atrasada" : "Tarefa para hoje",
            mensagem,
            tipo: "lead_task",
            link: "/crm",
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
