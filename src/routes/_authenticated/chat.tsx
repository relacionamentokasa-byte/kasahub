import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Search, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { fetchProfiles } from "@/lib/profile-api";
import { usePresence } from "@/hooks/use-presence";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [{ title: "Chat — KASA HUB" }],
  }),
  component: ChatPage,
});

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

function ChatPage() {
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  const onlineIds = usePresence(currentUserId);

  const { data: profiles = [] } = useQuery({
    queryKey: ["chat-profiles"],
    queryFn: fetchProfiles,
  });

  const contacts = useMemo(
    () =>
      profiles
        .filter((p: any) => p.id !== currentUserId)
        .filter((p: any) => {
          const name = (p.display_name || p.full_name || "").toLowerCase();
          return name.includes(search.toLowerCase());
        }),
    [profiles, currentUserId, search],
  );

  const selectedContact = contacts.find((c: any) => c.id === selectedContactId);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Sidebar contatos */}
      <aside className="w-72 border-r border-border flex flex-col bg-surface/30">
        <div className="p-4 border-b border-border">
          <h2 className="font-display text-lg font-bold mb-3 flex items-center gap-2">
            <MessageSquare className="size-4 text-primary" />
            Conversas
          </h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar contato..."
              className="pl-8 h-9"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <ul className="p-2 space-y-1">
            {contacts.map((c: any) => {
              const isOnline = onlineIds.has(c.id);
              const name = c.display_name || c.full_name || "Sem nome";
              const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
              const active = selectedContactId === c.id;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => setSelectedContactId(c.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left",
                      active ? "bg-primary/10 text-primary" : "hover:bg-white/5 text-foreground/80",
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="size-9">
                        {c.avatar_url && <AvatarImage src={c.avatar_url} alt={name} />}
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <span
                        className={cn(
                          "absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-background",
                          isOnline ? "bg-green-500" : "bg-muted-foreground/40",
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {isOnline ? "Online" : "Offline"}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
            {contacts.length === 0 && (
              <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                Nenhum contato encontrado.
              </li>
            )}
          </ul>
        </ScrollArea>
      </aside>

      {/* Conversa */}
      <section className="flex-1 flex flex-col min-w-0">
        {selectedContact && currentUserId ? (
          <ConversationView
            currentUserId={currentUserId}
            contact={selectedContact}
            isOnline={onlineIds.has(selectedContact.id)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <MessageSquare className="size-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              Selecione um contato para iniciar uma conversa.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function ConversationView({
  currentUserId,
  contact,
  isOnline,
}: {
  currentUserId: string;
  contact: any;
  isOnline: boolean;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contactId = contact.id;
  const queryKey = ["messages", currentUserId, contactId];

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${currentUserId})`,
        )
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Message[];
    },
  });

  // Realtime: listen for new messages between the two
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${currentUserId}-${contactId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as Message;
          const involvesPair =
            (msg.sender_id === currentUserId && msg.receiver_id === contactId) ||
            (msg.sender_id === contactId && msg.receiver_id === currentUserId);
          if (!involvesPair) return;
          queryClient.setQueryData<Message[]>(queryKey, (prev = []) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, contactId, queryClient]);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, contactId]);

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: currentUserId,
      receiver_id: contactId,
      content,
    });
    setSending(false);
    if (error) {
      toast.error("Não foi possível enviar a mensagem.");
      console.error("send message error:", error);
      return;
    }
    setDraft("");
  };

  const name = contact.display_name || contact.full_name || "Sem nome";
  const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <>
      <header className="h-16 px-5 border-b border-border flex items-center gap-3 bg-surface/20">
        <div className="relative">
          <Avatar className="size-9">
            {contact.avatar_url && <AvatarImage src={contact.avatar_url} alt={name} />}
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span
            className={cn(
              "absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-background",
              isOnline ? "bg-green-500" : "bg-muted-foreground/40",
            )}
          />
        </div>
        <div>
          <p className="font-semibold text-sm">{name}</p>
          <p className="text-[10px] text-muted-foreground font-mono-kasa uppercase tracking-wider">
            {isOnline ? "Online agora" : "Offline"}
          </p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-12">
            Nenhuma mensagem ainda. Diga olá! 👋
          </div>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[70%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap break-words",
                  mine
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm",
                )}
              >
                <p>{m.content}</p>
                <p
                  className={cn(
                    "text-[9px] mt-1 font-mono-kasa uppercase tracking-wider",
                    mine ? "text-primary-foreground/60" : "text-muted-foreground",
                  )}
                >
                  {new Date(m.created_at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <footer className="p-3 border-t border-border bg-surface/20">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escreva uma mensagem..."
            className="flex-1"
            autoFocus
          />
          <Button type="submit" disabled={!draft.trim() || sending} size="icon">
            <Send className="size-4" />
          </Button>
        </form>
      </footer>
    </>
  );
}
