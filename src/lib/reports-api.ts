import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Slide } from "@/components/reports/types";

export type Report = Database["public"]["Tables"]["reports"]["Row"];
export type ReportTemplate = Database["public"]["Tables"]["report_templates"]["Row"];

export async function fetchReports(): Promise<Report[]> {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchReport(id: string): Promise<Report> {
  const { data, error } = await supabase.from("reports").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function fetchReportTemplates(): Promise<ReportTemplate[]> {
  const { data, error } = await supabase
    .from("report_templates")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createReport(input: {
  client_id: string | null;
  template_id: string | null;
  title: string;
  slides: Slide[];
}): Promise<Report> {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("reports")
    .insert({
      client_id: input.client_id,
      template_id: input.template_id,
      title: input.title,
      slides: input.slides as any,
      created_by: u.user?.id ?? null,
      status: "rascunho",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateReport(
  id: string,
  patch: Partial<Pick<Report, "title" | "status" | "client_id">> & { slides?: Slide[] },
) {
  const { error } = await supabase
    .from("reports")
    .update({ ...patch, slides: patch.slides as any })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteReport(id: string) {
  const { error } = await supabase.from("reports").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadReportImage(reportId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${reportId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("report-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = await supabase.storage.from("report-images").createSignedUrl(path, 60 * 60 * 24 * 365);
  return data?.signedUrl ?? "";
}
