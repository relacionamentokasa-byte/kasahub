import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const BodySchema = z.object({
  notification_id: z.string().uuid(),
});

function cleanVapidKey(raw: string | undefined, name: string): string {
  if (!raw) throw new Error(`${name} not set`);
  const compact = raw.replace(/\s+/g, "").replace(/^['"]|['"]$/g, "");
  if (/^[A-Za-z0-9_-]+$/.test(compact)) return compact;
  const matches = raw.match(/[A-Za-z0-9_-]{20,}/g) ?? [];
  const key = matches.find((v) => v.length >= 40);
  if (key) return key;
  throw new Error(`${name} invalid`);
}

function cleanVapidSubject(raw: string | undefined): string {
  const fallback = "mailto:admin@kasahub.app";
  if (!raw) return fallback;
  let s = raw.trim().replace(/^['"]|['"]$/g, "").replace(/^<|>$/g, "").trim();
  if (!s) return fallback;
  if (!/^(mailto:|https?:\/\/)/i.test(s)) {
    s = /@/.test(s) ? `mailto:${s}` : `https://${s}`;
  }
  return s;
}

export const Route = createFileRoute("/api/public/hooks/dispatch-push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed;
        try {
          const json = await request.json();
          parsed = BodySchema.parse(json);
        } catch {
          return new Response(JSON.stringify({ error: "invalid body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Load notification; only dispatch if created in last 5 minutes
        // to prevent arbitrary replay against guessed UUIDs.
        const { data: notif, error: notifErr } = await supabaseAdmin
          .from("notificacoes")
          .select("id, user_id, titulo, mensagem, link, created_at")

          .eq("id", parsed.notification_id)
          .single();

        if (notifErr || !notif) {
          return new Response(JSON.stringify({ error: "not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        const ageMs = Date.now() - new Date(notif.created_at!).getTime();
        if (ageMs > 5 * 60 * 1000) {

          return new Response(JSON.stringify({ error: "expired" }), {
            status: 410,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { data: subs, error: subsErr } = await supabaseAdmin
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth")
          .eq("user_id", notif.user_id!);

        if (subsErr) {
          return new Response(JSON.stringify({ error: subsErr.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (!subs || subs.length === 0) {
          return Response.json({ sent: 0, skipped: "no subscriptions" });
        }

        const publicKey = cleanVapidKey(process.env.VAPID_PUBLIC_KEY, "VAPID_PUBLIC_KEY");
        const privateKey = cleanVapidKey(process.env.VAPID_PRIVATE_KEY, "VAPID_PRIVATE_KEY");
        const subject = cleanVapidSubject(process.env.VAPID_SUBJECT);

        const webpush = (await import("web-push")).default;
        webpush.setVapidDetails(subject, publicKey, privateKey);

        const payload = JSON.stringify({
          title: notif.titulo || "KASA HUB",
          body: notif.mensagem || "",

          url: notif.link || "/",
          tag: `notif-${notif.id}`,
        });

        let sent = 0;
        const stale: string[] = [];
        await Promise.all(
          subs.map(async (s) => {
            try {
              await webpush.sendNotification(
                { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                payload,
              );
              sent += 1;
            } catch (err: unknown) {
              const code = (err as { statusCode?: number })?.statusCode;
              if (code === 404 || code === 410) stale.push(s.id);
            }
          }),
        );

        if (stale.length > 0) {
          await supabaseAdmin.from("push_subscriptions").delete().in("id", stale);
        }

        return Response.json({ sent, removed: stale.length });
      },
    },
  },
});
