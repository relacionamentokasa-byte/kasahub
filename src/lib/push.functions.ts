import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SubscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
  userAgent: z.string().max(512).optional(),
});

function cleanVapidKey(raw: string | undefined, name: string): string {
  if (!raw) throw new Error(`${name} não configurado`);
  const compact = raw.replace(/\s+/g, "").replace(/^['"]|['"]$/g, "");
  if (/^[A-Za-z0-9_-]+$/.test(compact)) return compact;

  const matches = raw.match(/[A-Za-z0-9_-]{20,}/g) ?? [];
  const key = matches.find((value) => value.length >= 40);
  if (key) return key;

  throw new Error(`${name} inválida`);
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

export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  const publicKey = cleanVapidKey(process.env.VAPID_PUBLIC_KEY, "VAPID_PUBLIC_KEY");
  return { publicKey };
});

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SubscriptionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: userId,
          endpoint: data.endpoint,
          p256dh: data.keys.p256dh,
          auth: data.keys.auth,
          user_agent: data.userAgent ?? null,
        },
        { onConflict: "user_id,endpoint" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ endpoint: z.string().url().max(2048) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", data.endpoint);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const publicKey = cleanVapidKey(process.env.VAPID_PUBLIC_KEY, "VAPID_PUBLIC_KEY");
    const privateKey = cleanVapidKey(process.env.VAPID_PRIVATE_KEY, "VAPID_PRIVATE_KEY");
    const subject = cleanVapidSubject(process.env.VAPID_SUBJECT);

    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    if (!subs || subs.length === 0) {
      throw new Error("Nenhuma inscrição de push encontrada. Ative as notificações primeiro.");
    }

    const webpush = (await import("web-push")).default;
    webpush.setVapidDetails(subject, publicKey, privateKey);

    const payload = JSON.stringify({
      title: "KASA HUB",
      body: "🔔 Notificação de teste enviada via Web Push (VAPID).",
      url: "/",
      tag: "test-notification",
    });

    let success = 0;
    const stale: string[] = [];
    const errors: { status?: number; body?: string; message?: string }[] = [];
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          );
          success += 1;
        } catch (err: unknown) {
          const e = err as { statusCode?: number; body?: string; message?: string };
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            stale.push(s.id);
          } else {
            errors.push({ status: e?.statusCode, body: e?.body?.slice(0, 200), message: e?.message });
          }
        }
      }),
    );

    if (stale.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", stale);
    }

    if (success === 0 && errors.length > 0) {
      const first = errors[0];
      throw new Error(
        `Falha no envio push (status ${first.status ?? "?"}): ${first.message ?? ""}${first.body ? ` — ${first.body}` : ""}`,
      );
    }

    return { sent: success, removed: stale.length, errors: errors.length };
  });
