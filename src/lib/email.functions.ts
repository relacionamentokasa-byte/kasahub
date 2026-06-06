import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FROM_DEFAULT = "KASA OS <onboarding@resend.dev>";

const SendEmailInput = z.object({
  to: z.string().email().max(320),
  subject: z.string().min(1).max(255),
  html: z.string().min(1).max(200_000),
  from: z.string().min(3).max(320).optional(),
  reply_to: z.string().email().max(320).optional(),
});

export const sendEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SendEmailInput.parse(input))
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      throw new Error("Integração Resend não configurada");
    }
    const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: data.from ?? FROM_DEFAULT,
        to: [data.to],
        subject: data.subject,
        html: data.html,
        reply_to: data.reply_to,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        `Resend ${res.status}: ${(body as { message?: string })?.message ?? "erro desconhecido"}`,
      );
    }
    return { id: (body as { id?: string }).id ?? null };
  });
