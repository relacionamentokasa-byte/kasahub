import { supabase } from "@/integrations/supabase/client";

export async function getMonthStrategy(clientId: string, year: number, month: number): Promise<string> {
  const { data, error } = await supabase
    .from("editorial_month_strategies")
    .select("strategy")
    .eq("client_id", clientId)
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();
  if (error) throw error;
  return data?.strategy ?? "";
}

export async function upsertMonthStrategy(clientId: string, year: number, month: number, strategy: string) {
  const { error } = await supabase
    .from("editorial_month_strategies")
    .upsert({ client_id: clientId, year, month, strategy }, { onConflict: "client_id,year,month" });
  if (error) throw error;
}
