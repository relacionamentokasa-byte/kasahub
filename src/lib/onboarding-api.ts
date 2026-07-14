import { supabase } from "@/integrations/supabase/client";

export type OnboardingTemplate = {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type OnboardingTemplateStep = {
  id: string;
  template_id: string;
  title: string;
  description: string | null;
  responsible_type: "agency" | "client" | "both";
  days_after_start: number;
  order_index: number;
};

export type Onboarding = {
  id: string;
  client_id: string;
  proposal_id: string | null;
  contract_id: string | null;
  template_id: string | null;
  title: string;
  description: string | null;
  status: "in_progress" | "completed" | "paused" | "cancelled";
  start_date: string;
  expected_end_date: string | null;
  completed_at: string | null;
  progress_percentage: number;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
};

export type OnboardingStep = {
  id: string;
  onboarding_id: string;
  title: string;
  description: string | null;
  responsible_type: "agency" | "client" | "both";
  assignee_id: string | null;
  due_date: string | null;
  status: "pending" | "in_progress" | "done" | "blocked" | "skipped";
  notes: string | null;
  order_index: number;
  completed_at: string | null;
  completed_by: string | null;
};

export function normalizeOnboardingText(text?: string | null) {
  if (!text) return text ?? null;
  return text
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n?/g, "\n");
}

// ============== TEMPLATES ==============
export async function fetchOnboardingTemplates() {
  const { data, error } = await (supabase as any)
    .from("onboarding_templates")
    .select("*")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as OnboardingTemplate[];
}

export async function fetchTemplateSteps(templateId: string) {
  const { data, error } = await (supabase as any)
    .from("onboarding_template_steps")
    .select("*")
    .eq("template_id", templateId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data as OnboardingTemplateStep[];
}

export async function createTemplate(input: Partial<OnboardingTemplate>) {
  const { data, error } = await (supabase as any)
    .from("onboarding_templates")
    .insert({
      ...input,
      description: normalizeOnboardingText(input.description),
    })
    .select()
    .single();
  if (error) throw error;
  return data as OnboardingTemplate;
}

export async function updateTemplate(id: string, input: Partial<OnboardingTemplate>) {
  const { data, error } = await (supabase as any)
    .from("onboarding_templates")
    .update({
      ...input,
      description: normalizeOnboardingText(input.description),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as OnboardingTemplate;
}

export async function duplicateTemplate(id: string) {
  const tplRes = await (supabase as any)
    .from("onboarding_templates")
    .select("*")
    .eq("id", id)
    .single();
  if (tplRes.error) throw tplRes.error;
  const tpl = tplRes.data as OnboardingTemplate;

  const stepsRes = await (supabase as any)
    .from("onboarding_template_steps")
    .select("*")
    .eq("template_id", id)
    .order("order_index", { ascending: true });
  if (stepsRes.error) throw stepsRes.error;
  const tplSteps = stepsRes.data as OnboardingTemplateStep[];

  const { data: newTpl, error: newErr } = await (supabase as any)
    .from("onboarding_templates")
    .insert({
      name: `${tpl.name} (cópia)`,
      description: tpl.description,
      is_default: false,
      is_active: tpl.is_active,
    })
    .select()
    .single();
  if (newErr) throw newErr;

  if (tplSteps.length > 0) {
    const rows = tplSteps.map((s) => ({
      template_id: newTpl.id,
      title: s.title,
      description: s.description,
      responsible_type: s.responsible_type,
      days_after_start: s.days_after_start,
      order_index: s.order_index,
    }));
    const { error: stepsErr } = await (supabase as any)
      .from("onboarding_template_steps")
      .insert(rows);
    if (stepsErr) throw stepsErr;
  }

  return newTpl as OnboardingTemplate;
}

export async function deleteTemplate(id: string) {
  const { error } = await (supabase as any).from("onboarding_templates").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertTemplateStep(input: Partial<OnboardingTemplateStep>) {
  const { data, error } = await (supabase as any)
    .from("onboarding_template_steps")
    .upsert({
      ...input,
      description: normalizeOnboardingText(input.description),
    })
    .select()
    .single();
  if (error) throw error;
  return data as OnboardingTemplateStep;
}

export async function deleteTemplateStep(id: string) {
  const { error } = await (supabase as any).from("onboarding_template_steps").delete().eq("id", id);
  if (error) throw error;
}

// ============== INSTANCES ==============
export async function fetchOnboardings(filter: { clientId?: string } = {}) {
  let q = (supabase as any).from("onboardings").select("*").order("created_at", { ascending: false });
  if (filter.clientId) q = q.eq("client_id", filter.clientId);
  const { data, error } = await q;
  if (error) throw error;
  return data as Onboarding[];
}

export async function fetchOnboardingSteps(onboardingId: string) {
  const { data, error } = await (supabase as any)
    .from("onboarding_steps")
    .select("*")
    .eq("onboarding_id", onboardingId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data as OnboardingStep[];
}

export async function createOnboardingFromTemplate(opts: {
  client_id: string;
  template_id: string;
  title?: string;
  start_date?: string; // YYYY-MM-DD
}) {
  const tplRes = await (supabase as any)
    .from("onboarding_templates")
    .select("*")
    .eq("id", opts.template_id)
    .single();
  if (tplRes.error) throw tplRes.error;
  const tpl = tplRes.data as OnboardingTemplate;

  const stepsRes = await (supabase as any)
    .from("onboarding_template_steps")
    .select("*")
    .eq("template_id", opts.template_id)
    .order("order_index", { ascending: true });
  if (stepsRes.error) throw stepsRes.error;
  const tplSteps = stepsRes.data as OnboardingTemplateStep[];

  const maxDays = tplSteps.reduce((m, s) => Math.max(m, s.days_after_start), 0);
  const startStr = opts.start_date || new Date().toISOString().slice(0, 10);
  const start = new Date(startStr + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + maxDays);

  const { data: onb, error: onbErr } = await (supabase as any)
    .from("onboardings")
    .insert({
      client_id: opts.client_id,
      template_id: opts.template_id,
      title: opts.title || `Onboarding: ${tpl.name}`,
      description: tpl.description,
      start_date: startStr,
      expected_end_date: end.toISOString().slice(0, 10),
    })
    .select()
    .single();
  if (onbErr) throw onbErr;

  if (tplSteps.length > 0) {
    const rows = tplSteps.map((s) => {
      const due = new Date(start);
      due.setDate(due.getDate() + s.days_after_start);
      return {
        onboarding_id: onb.id,
        title: s.title,
        description: s.description,
        responsible_type: s.responsible_type,
        due_date: due.toISOString().slice(0, 10),
        order_index: s.order_index,
      };
    });
    const { error: stepsErr } = await (supabase as any).from("onboarding_steps").insert(rows);
    if (stepsErr) throw stepsErr;
  }

  return onb as Onboarding;
}

/**
 * Re-sincroniza as etapas de um onboarding com o modelo de origem.
 * - Insere etapas novas do modelo que ainda não existem na instância (match por título).
 * - Atualiza descrição, responsável, ordem e prazo (recalculado a partir do start_date) das existentes.
 * - Preserva status/notas/completed_at das etapas já trabalhadas.
 * - Não remove etapas customizadas que já existam na instância.
 */
export async function syncOnboardingWithTemplate(onboardingId: string) {
  const onbRes = await (supabase as any)
    .from("onboardings")
    .select("*")
    .eq("id", onboardingId)
    .single();
  if (onbRes.error) throw onbRes.error;
  const onb = onbRes.data as Onboarding;
  if (!onb.template_id) {
    throw new Error("Este onboarding não está vinculado a um modelo.");
  }

  const tplStepsRes = await (supabase as any)
    .from("onboarding_template_steps")
    .select("*")
    .eq("template_id", onb.template_id)
    .order("order_index", { ascending: true });
  if (tplStepsRes.error) throw tplStepsRes.error;
  const tplSteps = tplStepsRes.data as OnboardingTemplateStep[];

  const instRes = await (supabase as any)
    .from("onboarding_steps")
    .select("*")
    .eq("onboarding_id", onboardingId);
  if (instRes.error) throw instRes.error;
  const instSteps = instRes.data as OnboardingStep[];

  const start = new Date(onb.start_date + "T00:00:00");
  const byTitle = new Map(instSteps.map((s) => [s.title.trim().toLowerCase(), s]));

  const toInsert: any[] = [];
  const toUpdate: { id: string; patch: any }[] = [];

  for (const t of tplSteps) {
    const due = new Date(start);
    due.setDate(due.getDate() + t.days_after_start);
    const dueStr = due.toISOString().slice(0, 10);
    const key = t.title.trim().toLowerCase();
    const existing = byTitle.get(key);
    if (existing) {
      toUpdate.push({
        id: existing.id,
        patch: {
          description: t.description,
          responsible_type: t.responsible_type,
          order_index: t.order_index,
          // Só atualiza o prazo se a etapa ainda não foi concluída
          ...(existing.status === "done" ? {} : { due_date: dueStr }),
        },
      });
    } else {
      toInsert.push({
        onboarding_id: onboardingId,
        title: t.title,
        description: t.description,
        responsible_type: t.responsible_type,
        due_date: dueStr,
        order_index: t.order_index,
      });
    }
  }

  if (toInsert.length > 0) {
    const { error } = await (supabase as any).from("onboarding_steps").insert(toInsert);
    if (error) throw error;
  }
  for (const u of toUpdate) {
    const { error } = await (supabase as any)
      .from("onboarding_steps")
      .update(u.patch)
      .eq("id", u.id);
    if (error) throw error;
  }

  // Recalcula previsão de término com base no maior prazo do modelo
  const maxDays = tplSteps.reduce((m, s) => Math.max(m, s.days_after_start), 0);
  const end = new Date(start);
  end.setDate(end.getDate() + maxDays);
  await (supabase as any)
    .from("onboardings")
    .update({ expected_end_date: end.toISOString().slice(0, 10) })
    .eq("id", onboardingId);

  return { inserted: toInsert.length, updated: toUpdate.length };
}

/**
 * Re-sincroniza todas as instâncias de onboarding que usam um modelo específico.
 * Chamado automaticamente quando o modelo é editado nas configurações.
 */
export async function syncAllOnboardingsForTemplate(templateId: string) {
  const { data, error } = await (supabase as any)
    .from("onboardings")
    .select("id")
    .eq("template_id", templateId)
    .in("status", ["in_progress", "paused"]);
  if (error) throw error;
  const list = (data ?? []) as { id: string }[];
  let synced = 0;
  for (const o of list) {
    try {
      await syncOnboardingWithTemplate(o.id);
      synced++;
    } catch (e) {
      console.error("sync failed for onboarding", o.id, e);
    }
  }
  return { total: list.length, synced };
}

/**
 * Atualiza a data de início do onboarding e recalcula os prazos de todas as
 * etapas ainda não concluídas com base nos dias configurados no modelo
 * (onboarding_template_steps.days_after_start).
 */
export async function updateOnboardingStartDate(onboardingId: string, startDate: string) {
  const onbRes = await (supabase as any)
    .from("onboardings")
    .select("*")
    .eq("id", onboardingId)
    .single();
  if (onbRes.error) throw onbRes.error;
  const onb = onbRes.data as Onboarding;

  const stepsRes = await (supabase as any)
    .from("onboarding_steps")
    .select("*")
    .eq("onboarding_id", onboardingId);
  if (stepsRes.error) throw stepsRes.error;
  const instSteps = stepsRes.data as OnboardingStep[];

  let tplSteps: OnboardingTemplateStep[] = [];
  if (onb.template_id) {
    const tplRes = await (supabase as any)
      .from("onboarding_template_steps")
      .select("*")
      .eq("template_id", onb.template_id);
    if (tplRes.error) throw tplRes.error;
    tplSteps = tplRes.data as OnboardingTemplateStep[];
  }

  const start = new Date(startDate + "T00:00:00");
  const byTitle = new Map(
    tplSteps.map((t) => [t.title.trim().toLowerCase(), t.days_after_start]),
  );

  let maxDays = 0;
  for (const s of instSteps) {
    if (s.status === "done") continue;
    const days = byTitle.get(s.title.trim().toLowerCase());
    if (days === undefined) continue;
    const due = new Date(start);
    due.setDate(due.getDate() + days);
    const dueStr = due.toISOString().slice(0, 10);
    if (days > maxDays) maxDays = days;
    const { error } = await (supabase as any)
      .from("onboarding_steps")
      .update({ due_date: dueStr })
      .eq("id", s.id);
    if (error) throw error;
  }
  // maxDays também considera etapas do modelo (mesmo que done na instância)
  for (const t of tplSteps) if (t.days_after_start > maxDays) maxDays = t.days_after_start;

  const end = new Date(start);
  end.setDate(end.getDate() + maxDays);

  const { error } = await (supabase as any)
    .from("onboardings")
    .update({
      start_date: startDate,
      expected_end_date: end.toISOString().slice(0, 10),
    })
    .eq("id", onboardingId);
  if (error) throw error;
}

export async function updateOnboardingStep(id: string, input: Partial<OnboardingStep>) {
  const payload: any = { ...input };
  if ("description" in input) {
    payload.description = normalizeOnboardingText(input.description);
  }
  if (input.status === "done" && !input.completed_at) {
    payload.completed_at = new Date().toISOString();
  }
  if (input.status && input.status !== "done") {
    payload.completed_at = null;
  }
  const { data, error } = await (supabase as any)
    .from("onboarding_steps")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as OnboardingStep;
}

export async function deleteOnboarding(id: string) {
  const { error } = await (supabase as any).from("onboardings").delete().eq("id", id);
  if (error) throw error;
}
