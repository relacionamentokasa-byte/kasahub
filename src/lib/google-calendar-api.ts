import { supabase } from "@/integrations/supabase/client";

export interface GoogleCalendarConnection {
  id: string;
  user_id: string;
  google_account_email: string | null;
  selected_calendar_id: string;
  is_sync_enabled: boolean;
  is_bidirectional: boolean;
  last_pulled_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchGoogleCalendarConnection(): Promise<GoogleCalendarConnection | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("google_calendar_connections")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data as GoogleCalendarConnection | null;
}

export async function upsertGoogleCalendarConnection(patch: Partial<GoogleCalendarConnection>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data: existing } = await supabase
    .from("google_calendar_connections")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("google_calendar_connections")
      .update(patch)
      .eq("user_id", user.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("google_calendar_connections")
      .insert({ ...patch, user_id: user.id });
    if (error) throw error;
  }
}

export async function disconnectGoogleCalendar() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("google_calendar_connections")
    .delete()
    .eq("user_id", user.id);
  
  if (error) throw error;
}
