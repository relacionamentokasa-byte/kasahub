import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SLUG_RE = /^[a-z0-9-]+$/;

const LeadSourceInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120).regex(SLUG_RE, "Slug deve conter apenas letras minúsculas, números e hífen"),
  is_active: z.boolean().default(true),
  default_stage_id: z.string().uuid().nullable().optional(),
  notify_user_ids: z.array(z.string().uuid()).default([]),
  landing_headline: z.string().max(200).nullable().optional(),
  landing_subheadline: z.string().max(300).nullable().optional(),
  landing_description: z.string().max(2000).nullable().optional(),
  landing_cta_label: z.string().max(80).nullable().optional(),
  landing_logo_url: z.preprocess((v) => (v === "" || v == null ? null : v), z.string().nullable().optional()),
  landing_hero_image_url: z.preprocess((v) => (v === "" || v == null ? null : v), z.string().nullable().optional()),
  landing_bg_color: z.string().max(20).nullable().optional(),
  landing_accent_color: z.string().max(20).nullable().optional(),
  landing_benefits: z.array(z.object({ title: z.string(), description: z.string().optional() })).default([]),
  landing_testimonials: z.array(z.object({ author: z.string(), text: z.string(), role: z.string().optional() })).default([]),
  landing_form_fields: z.array(z.enum(["name", "email", "phone", "company", "message", "budget"])).default(["name", "email", "phone", "message"]),
  landing_success_message: z.string().max(500).nullable().optional(),
  landing_redirect_url: z.preprocess((v) => (v === "" || v == null ? null : v), z.string().nullable().optional()),
  pixel_meta_id: z.string().max(50).nullable().optional(),
  gtag_id: z.string().max(50).nullable().optional(),
});

export const listLeadSources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("lead_sources")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    // Lead counts per source
    const ids = (data ?? []).map((s) => s.id);
    let counts: Record<string, number> = {};
    let lastSubs: Record<string, string> = {};
    if (ids.length > 0) {
      const { data: leadCounts } = await context.supabase
        .from("leads")
        .select("source_id")
        .in("source_id", ids);
      (leadCounts ?? []).forEach((l: any) => {
        if (l.source_id) counts[l.source_id] = (counts[l.source_id] ?? 0) + 1;
      });
      const { data: subs } = await context.supabase
        .from("lead_source_submissions")
        .select("source_id, created_at")
        .in("source_id", ids)
        .order("created_at", { ascending: false })
        .limit(200);
      (subs ?? []).forEach((s: any) => {
        if (s.source_id && !lastSubs[s.source_id]) lastSubs[s.source_id] = s.created_at;
      });
    }

    return (data ?? []).map((s: any) => ({
      ...s,
      lead_count: counts[s.id] ?? 0,
      last_submission_at: lastSubs[s.id] ?? null,
    }));
  });

export const getLeadSource = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("lead_sources")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const upsertLeadSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => LeadSourceInput.parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const payload: any = {
      ...rest,
      landing_logo_url: rest.landing_logo_url || null,
      landing_hero_image_url: rest.landing_hero_image_url || null,
      landing_redirect_url: rest.landing_redirect_url || null,
      owner_id: context.userId,
    };
    if (id) {
      const { data: row, error } = await context.supabase
        .from("lead_sources")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row;
    } else {
      const { data: row, error } = await context.supabase
        .from("lead_sources")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
  });

export const deleteLeadSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("lead_sources").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const regenerateLeadSourceSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const secret = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    const { data: row, error } = await context.supabase
      .from("lead_sources")
      .update({ secret })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listLeadSourceSubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sourceId: string }) => z.object({ sourceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("lead_source_submissions")
      .select("*")
      .eq("source_id", data.sourceId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
