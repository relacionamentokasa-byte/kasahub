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
  metadata: {
    author_name?: string;
    author_avatar?: string;
    [key: string]: any;
  } | null;
  created_at: string;
}

export async function fetchNotifications() {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("is_archived", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as any as Notification[];
}

export async function markAsRead(id: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true } as any)
    .eq("id", id);
  if (error) throw error;
}

export async function markAllAsRead() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true } as any)
    .eq("user_id", user.id)
    .eq("is_read", false);
  if (error) throw error;
}

export async function archiveNotification(id: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_archived: true } as any)
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
  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData.user?.id;
  let metadata = null;

  if (currentUserId) {
    const { data: profile } = await supabase.from('profiles').select('display_name, full_name, avatar_url').eq('id', currentUserId).maybeSingle();
    metadata = {
      author_name: profile?.display_name || profile?.full_name || 'Alguém',
      author_avatar: profile?.avatar_url
    };
  } else {
    metadata = {
      author_name: 'Sistema',
      author_avatar: null
    };
  }

  console.log("Enviando notificação para:", input.userId, "Categoria:", input.category);
  const { error } = await supabase.rpc("notify_user", {
    p_user_id: input.userId,
    p_title: input.title,
    p_description: input.description ?? null,
    p_type: input.type ?? "info",
    p_category: input.category ?? "general",
    p_link: input.link ?? null,
    p_origin_type: input.originType ?? null,
    p_origin_id: input.originId ?? null,
    p_metadata: metadata
  } as any);
  if (error) {
    console.error("Erro ao chamar rpc.notify_user:", error);
    throw error;
  }
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
  
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, full_name")
    .or(`display_name.ilike.any.{${names.join(",")}},full_name.ilike.any.{${names.join(",")}}`);

  if (profileError) {
    console.error("Erro ao buscar perfis para menções:", profileError);
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.log("Nenhum perfil correspondente encontrado para menções:", names);
    return;
  }

  const { data: userData } = await supabase.auth.getUser();
  const currentUserId = userData.user?.id || '';
  
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("display_name, full_name")
    .eq("id", currentUserId)
    .maybeSingle();

  const authorName = currentProfile?.display_name || currentProfile?.full_name || 'Alguém';

  for (const profile of profiles) {
    if (profile.id === currentUserId) continue;
    
    await notify({
      userId: profile.id,
      title: `${authorName} mencionou você`,
      description: `Em: ${context.title}`,
      category: "mention" as const,
      link: context.link,
      originType: context.originType,
      originId: context.originId
    });
  }
}
