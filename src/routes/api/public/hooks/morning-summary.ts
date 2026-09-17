import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/morning-summary")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        const todayStr = now.toISOString().slice(0, 10);

        // 1. Coletar dados gerais da agência para o panorama do dia
        const [
          { data: jobsToday },
          { data: jobsOverdue },
          { data: pendingApprovals },
          { data: leadTasksToday },
          { data: users }
        ] = await Promise.all([
          // Jobs com entrega prevista para hoje
          supabaseAdmin
            .from("jobs")
            .select("id, title")
            .eq("due_date", todayStr)
            .neq("status", "done"),

          // Jobs em atraso
          supabaseAdmin
            .from("jobs")
            .select("id, title")
            .lt("due_date", todayStr)
            .neq("status", "done"),

          // Aprovações pendentes com clientes
          supabaseAdmin
            .from("approval_items")
            .select("id, title")
            .eq("status", "pending")
            .is("archived_at", null),

          // Follow-ups e tarefas de CRM para hoje
          supabaseAdmin
            .from("lead_tasks")
            .select("id, title")
            .eq("status", "pending")
            .lte("due_date", endOfDay.toISOString()),

          // Todos os membros da equipe ativos
          supabaseAdmin
            .from("profiles")
            .select("id, display_name, full_name")
        ]);

        const countJobsToday = jobsToday?.length ?? 0;
        const countJobsOverdue = jobsOverdue?.length ?? 0;
        const countApprovals = pendingApprovals?.length ?? 0;
        const countTasks = leadTasksToday?.length ?? 0;

        // Se não houver absolutamente nada em aberto, pula o disparo
        if (countJobsToday === 0 && countJobsOverdue === 0 && countApprovals === 0 && countTasks === 0) {
          return new Response(
            JSON.stringify({ ok: true, sent: 0, reason: "no pending items" }),
            { headers: { "content-type": "application/json" } }
          );
        }

        // 2. Montar texto resumido e executivo
        const parts: string[] = [];
        if (countJobsToday > 0) parts.push(`${countJobsToday} ${countJobsToday === 1 ? 'job para hoje' : 'jobs para hoje'}`);
        if (countJobsOverdue > 0) parts.push(`${countJobsOverdue} ${countJobsOverdue === 1 ? 'em atraso' : 'em atraso'}`);
        if (countApprovals > 0) parts.push(`${countApprovals} ${countApprovals === 1 ? 'aprovação pendente' : 'aprovações pendentes'}`);
        if (countTasks > 0) parts.push(`${countTasks} ${countTasks === 1 ? 'tarefa CRM' : 'tarefas CRM'}`);

        const mensagem = `Panorama de hoje: ${parts.join(" • ")}. Toque para acessar a operação.`;

        // 3. Evitar duplicatas no mesmo dia
        const { data: alreadySent } = await supabaseAdmin
          .from("notificacoes")
          .select("user_id")
          .eq("tipo", "morning_summary")
          .gte("created_at", startOfDay.toISOString());

        const sentUserIds = new Set((alreadySent ?? []).map((n) => n.user_id));

        const targetUsers = (users ?? []).filter((u) => !sentUserIds.has(u.id));

        if (!targetUsers.length) {
          return new Response(
            JSON.stringify({ ok: true, sent: 0, reason: "already sent today" }),
            { headers: { "content-type": "application/json" } }
          );
        }

        const notificationsToInsert = targetUsers.map((u) => ({
          user_id: u.id,
          titulo: "☀️ Bom dia, Time KASA!",
          mensagem,
          tipo: "morning_summary",
          link: "/dashboard",
        }));

        const { data: insertedNotifs, error: insertError } = await supabaseAdmin
          .from("notificacoes")
          .insert(notificationsToInsert)
          .select("id, user_id, titulo, mensagem, link");

        if (insertError) {
          return new Response(
            JSON.stringify({ error: insertError.message }),
            { status: 500, headers: { "content-type": "application/json" } }
          );
        }

        // 4. Disparar Web Push (VAPID) diretamente para os celulares inscritos
        let pushSentCount = 0;
        try {
          const publicKeyRaw = process.env.VAPID_PUBLIC_KEY;
          const privateKeyRaw = process.env.VAPID_PRIVATE_KEY;
          const subjectRaw = process.env.VAPID_SUBJECT || "mailto:admin@kasahub.app";

          if (publicKeyRaw && privateKeyRaw && insertedNotifs?.length) {
            const webpush = (await import("web-push")).default;
            webpush.setVapidDetails(subjectRaw, publicKeyRaw.replace(/\s+/g, ""), privateKeyRaw.replace(/\s+/g, ""));

            for (const notif of insertedNotifs) {
              if (!notif.user_id) continue;
              const { data: subs } = await supabaseAdmin
                .from("push_subscriptions")
                .select("id, endpoint, p256dh, auth")
                .eq("user_id", notif.user_id);

              if (subs && subs.length > 0) {
                const payload = JSON.stringify({
                  title: notif.titulo || "☀️ Bom dia, Time KASA!",
                  body: notif.mensagem,
                  url: notif.link || "/dashboard",
                  tag: `morning-summary-${todayStr}`,
                });

                await Promise.all(
                  subs.map(async (s) => {
                    try {
                      await webpush.sendNotification(
                        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                        payload
                      );
                      pushSentCount++;
                    } catch (error: unknown) {
                      const statusCode =
                        typeof error === "object" && error !== null && "statusCode" in error
                          ? Number(error.statusCode)
                          : undefined;
                      if (statusCode === 404 || statusCode === 410) {
                        await supabaseAdmin.from("push_subscriptions").delete().eq("id", s.id);
                      }
                    }
                  })
                );
              }
            }
          }
        } catch (pushErr) {
          console.warn("Aviso: Falha ao enviar Web Push do resumo matinal", pushErr);
        }

        return new Response(
          JSON.stringify({ ok: true, sent: notificationsToInsert.length, pushDelivered: pushSentCount, summary: mensagem }),
          { headers: { "content-type": "application/json" } }
        );
      },
    },
  },
});
