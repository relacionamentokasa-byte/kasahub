import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GW = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

function authHeaders() {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const GOOGLE_CALENDAR_API_KEY = process.env.GOOGLE_CALENDAR_API_KEY;
  if (!LOVABLE_API_KEY || !GOOGLE_CALENDAR_API_KEY) {
    throw new Error("Integração Google Agenda não configurada");
  }
  return {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "X-Connection-Api-Key": GOOGLE_CALENDAR_API_KEY,
    "Content-Type": "application/json",
  };
}

export interface GCalEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  htmlLink?: string;
  hangoutLink?: string;
  location?: string;
}

export const listGoogleEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        calendarId: z.string().min(1).max(255).default("primary"),
        timeMin: z.string().min(1).max(64).optional(),
        timeMax: z.string().min(1).max(64).optional(),
        maxResults: z.number().int().min(1).max(250).default(50),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data }) => {
    const url = new URL(`${GW}/calendars/${encodeURIComponent(data.calendarId)}/events`);
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("maxResults", String(data.maxResults));
    if (data.timeMin) url.searchParams.set("timeMin", data.timeMin);
    if (data.timeMax) url.searchParams.set("timeMax", data.timeMax);
    const res = await fetch(url, { headers: authHeaders() });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        `Google Calendar ${res.status}: ${(body as { error?: { message?: string } })?.error?.message ?? "erro"}`,
      );
    }
    return ((body as { items?: GCalEvent[] }).items ?? []) as GCalEvent[];
  });

const CreateInput = z.object({
  calendarId: z.string().min(1).max(255).default("primary"),
  summary: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  location: z.string().max(500).optional(),
  startISO: z.string().min(10).max(64),
  endISO: z.string().min(10).max(64),
  timeZone: z.string().min(1).max(64).default("America/Sao_Paulo"),
});

export const createGoogleEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => CreateInput.parse(i))
  .handler(async ({ data }) => {
    const res = await fetch(
      `${GW}/calendars/${encodeURIComponent(data.calendarId)}/events`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          summary: data.summary,
          description: data.description,
          location: data.location,
          start: { dateTime: data.startISO, timeZone: data.timeZone },
          end: { dateTime: data.endISO, timeZone: data.timeZone },
        }),
      },
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        `Google Calendar ${res.status}: ${(body as { error?: { message?: string } })?.error?.message ?? "erro"}`,
      );
    }
    return body as GCalEvent;
  });
