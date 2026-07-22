import { supabase } from "@/integrations/supabase/client";

export type AiThread = {
  id: string;
  user_id: string;
  title: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type AiMessage = {
  id: string;
  thread_id: string;
  user_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  parts: any;
  context_used: any;
  model: string | null;
  created_at: string;
};

export async function listThreads(): Promise<AiThread[]> {
  const { data, error } = await supabase
    .from("ai_threads" as any)
    .select("*")
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AiThread[];
}

export async function createThread(title = "Nova conversa"): Promise<AiThread> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("ai_threads" as any)
    .insert({ title, user_id: userData.user.id })
    .select("*")
    .single();
  if (error) throw error;
  return data as AiThread;
}

export async function renameThread(id: string, title: string) {
  const { error } = await supabase.from("ai_threads" as any).update({ title }).eq("id", id);
  if (error) throw error;
}

export async function togglePinThread(id: string, pinned: boolean) {
  const { error } = await supabase.from("ai_threads" as any).update({ pinned }).eq("id", id);
  if (error) throw error;
}

export async function deleteThread(id: string) {
  const { error } = await supabase.from("ai_threads" as any).delete().eq("id", id);
  if (error) throw error;
}

export async function fetchMessages(threadId: string): Promise<AiMessage[]> {
  const { data, error } = await supabase
    .from("ai_messages" as any)
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AiMessage[];
}

export async function insertMessage(input: {
  thread_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  parts?: any;
  context_used?: any;
  model?: string | null;
}): Promise<AiMessage> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("ai_messages" as any)
    .insert({ ...input, user_id: userData.user.id })
    .select("*")
    .single();
  if (error) throw error;
  // bump thread updated_at
  await supabase
    .from("ai_threads" as any)
    .update({ updated_at: new Date().toISOString() })
    .eq("id", input.thread_id);
  return data as AiMessage;
}
