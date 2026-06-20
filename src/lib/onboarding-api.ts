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
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as OnboardingTemplate;
}

export async function updateTemplate(id: string, input: Partial<OnboardingTemplate>) {
  const { data, error } = await (supabase as any)
    .from("onboarding_templates")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as OnboardingTemplate;
}

export async function deleteTemplate(id: string) {
  const { error } = await (supabase as any).from("onboarding_templates").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertTemplateStep(input: Partial<OnboardingTemplateStep>) {
  const { data, error } = await (supabase as any)
    .from("onboarding_template_steps")
    .upsert(input)
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
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + maxDays);

  const { data: onb, error: onbErr } = await (supabase as any)
    .from("onboardings")
    .insert({
      client_id: opts.client_id,
      template_id: opts.template_id,
      title: opts.title || `Onboarding: ${tpl.name}`,
      description: tpl.description,
      start_date: today.toISOString().slice(0, 10),
      expected_end_date: end.toISOString().slice(0, 10),
    })
    .select()
    .single();
  if (onbErr) throw onbErr;

  if (tplSteps.length > 0) {
    const rows = tplSteps.map((s) => {
      const due = new Date(today);
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

export async function updateOnboardingStep(id: string, input: Partial<OnboardingStep>) {
  const payload: any = { ...input };
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
