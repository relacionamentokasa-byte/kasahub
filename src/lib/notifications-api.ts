import { supabase } from "@/integrations/supabase/client";

export interface Notificacao {
  id: string;
  user_id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  lido: boolean;
  link: string | null;
  created_at: string;
}

export async function fetchNotifications() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("notificacoes")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar notificações:", error);
    return [];
  }
  return data as Notificacao[];
}

export async function enviarNotificacao(
  destinatario_id: string,
  titulo: string,
  mensagem: string,
  tipo: string = "geral",
  link?: string
) {
  const { error } = await supabase
    .from("notificacoes")
    .insert({
      user_id: destinatario_id,
      titulo,
      mensagem,
      tipo,
      link: link || null
    });

  if (error) {
    console.error("Erro ao enviar notificação:", error);
    throw error;
  }
}

export async function enviarNotificacaoMultipla(
  destinatarios_ids: string[],
  titulo: string,
  mensagem: string,
  tipo: string = "geral",
  link?: string
) {
  if (destinatarios_ids.length === 0) return;
  
  const inserts = destinatarios_ids.map(id => ({
    user_id: id,
    titulo,
    mensagem,
    tipo,
    link: link || null
  }));

  const { error } = await supabase
    .from("notificacoes")
    .insert(inserts);

  if (error) {
    console.error("Erro ao enviar notificações múltiplas:", error);
    throw error;
  }
}

// CriarNotificacao agora é um alias para enviarNotificacao
export const criarNotificacao = enviarNotificacao;

// Mantendo alias para compatibilidade com código existente
export const notify = async (input: {
  userId: string;
  title: string;
  description?: string;
  type?: string;
  category?: string;
  link?: string;
  [key: string]: any;
}) => {
  return enviarNotificacao(
    input.userId,
    input.title,
    input.description || "",
    input.type || input.category || "geral",
    input.link
  );
};


export async function marcarComoLida(id: string) {
  const { error } = await supabase
    .from("notificacoes")
    .update({ lido: true })
    .eq("id", id);

  if (error) {
    console.error("Erro ao marcar como lida:", error);
    throw error;
  }
}

export async function marcarTodasComoLidas() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("notificacoes")
    .update({ lido: true })
    .eq("user_id", user.id)
    .eq("lido", false);

  if (error) {
    console.error("Erro ao marcar todas como lidas:", error);
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

  if (profileError || !profiles) return;

  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id;
  
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("display_name, full_name")
    .eq("id", currentUserId || "")
    .maybeSingle();

  const authorName = currentProfile?.display_name || currentProfile?.full_name || 'Alguém';

  const notificationPromises = profiles
    .filter(profile => profile.id !== currentUserId)
    .map(profile => 
      enviarNotificacao(
        profile.id,
        `${authorName} mencionou você`,
        `Mencionou você no job: ${context.title}`,
        "mention",
        context.link
      )
    );

  await Promise.all(notificationPromises);
}
