import { supabase } from "@/integrations/supabase/client";

export type NotificationType = "info" | "alert" | "critical";
export type NotificationCategory = "mention" | "comment" | "job" | "approval" | "agenda" | "finance" | "general";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  type: NotificationType;
  category: NotificationCategory;
  link: string | null;
  origin_type: string | null;
  origin_id: string | null;
  is_read: boolean;
  is_archived: boolean;
  created_at: string;
}

export async function fetchNotifications() {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("is_archived", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Notification[];
}

export async function markAsRead(id: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);
  if (error) throw error;
}

export async function markAllAsRead() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);
  if (error) throw error;
}

export async function archiveNotification(id: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_archived: true })
    .eq("id", id);
  if (error) throw error;
}

export async function notify(input: {
  userId: string;
  title: string;
  description?: string;
  type?: NotificationType;
  category?: NotificationCategory;
  link?: string;
  originType?: string;
  originId?: string;
}) {
  const { error } = await supabase.rpc("notify_user", {
    p_user_id: input.userId,
    p_title: input.title,
    p_description: input.description || null,
    p_type: input.type || "info",
    p_category: input.category || "general",
    p_link: input.link || null,
    p_origin_type: input.originType || null,
    p_origin_id: input.originId || null
  });
  if (error) throw error;
}

export async function handleMentions(text: string, context: { 
  title: string, 
  link: string, 
  originType: string, 
  originId: string 
}) {
  const mentionRegex = /@(\w+)/g;
  const matches = text.match(mentionRegex);
  if (!matches) return;

  const names = matches.map(m => m.substring(1));
  
  // Buscar usuários por display_name ou full_name
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, full_name")
    .or(`display_name.in.(${names.join(",")}),full_name.in.(${names.join(",")})`);

  if (!profiles) return;

  const { data: { user: currentUser } } = await supabase.auth.getUser();

  for (const profile of profiles) {
    if (profile.id === currentUser?.id) continue;
    
    await notify({
      userId: profile.id,
      title: `${currentUser?.user_metadata?.display_name || 'Alguém'} mencionou você`,
      description: `Em: ${context.title}`,
      category: "mention",
      link: context.link,
      originType: context.originType,
      originId: context.originId
    });
  }
}
