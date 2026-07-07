import { supabase } from "@/integrations/supabase/client";

export type PresentationLayout =
  | "cover"
  | "content"
  | "image"
  | "split"
  | "quote"
  | "closing"
  | "cards";

export type Presentation = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PresentationSlide = {
  id: string;
  presentation_id: string;
  layout: PresentationLayout;
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  order_index: number;
};

export function normalizePresentationText(text?: string | null) {
  if (!text) return text ?? null;
  return text.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n?/g, "\n");
}

// ============== PRESENTATIONS ==============
export async function fetchPresentations() {
  const { data, error } = await (supabase as any)
    .from("presentations")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as Presentation[];
}

export async function fetchPresentation(id: string) {
  const { data, error } = await (supabase as any)
    .from("presentations")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Presentation;
}

export async function createPresentation(input: Partial<Presentation>) {
  const { data, error } = await (supabase as any)
    .from("presentations")
    .insert({
      name: input.name || "Nova apresentação",
      description: input.description ?? null,
      is_active: input.is_active ?? true,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Presentation;
}

export async function updatePresentation(id: string, input: Partial<Presentation>) {
  const { data, error } = await (supabase as any)
    .from("presentations")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Presentation;
}

export async function deletePresentation(id: string) {
  const { error } = await (supabase as any).from("presentations").delete().eq("id", id);
  if (error) throw error;
}

// ============== SLIDES ==============
export async function fetchSlides(presentationId: string) {
  const { data, error } = await (supabase as any)
    .from("presentation_slides")
    .select("*")
    .eq("presentation_id", presentationId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data as PresentationSlide[];
}

export async function upsertSlide(input: Partial<PresentationSlide>) {
  const { data, error } = await (supabase as any)
    .from("presentation_slides")
    .upsert({
      ...input,
      body: normalizePresentationText(input.body),
    })
    .select()
    .single();
  if (error) throw error;
  return data as PresentationSlide;
}

export async function deleteSlide(id: string) {
  const { error } = await (supabase as any)
    .from("presentation_slides")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function reorderSlides(items: { id: string; order_index: number }[]) {
  for (const it of items) {
    const { error } = await (supabase as any)
      .from("presentation_slides")
      .update({ order_index: it.order_index })
      .eq("id", it.id);
    if (error) throw error;
  }
}
