import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, X, ArrowLeft, Send, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { fetchProfiles } from "@/lib/profile-api";
import { usePresenceContext } from "@/contexts/PresenceContext";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export function GlobalChatWidget() {
  const [open, setOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const onlineIds = usePresence(currentUserId);

  const { data: profiles = [] } = useQuery({
    queryKey: ["chat-profiles"],
    queryFn: fetchProfiles,
    enabled: !!currentUserId,
  });

  // Unread messages per sender, sourced from the database (`read = false`).
  const unreadQueryKey = ["chat-unread", currentUserId] as const;
  const { data: unread = {} } = useQuery<Record<string, number>>({
    queryKey: unreadQueryKey,
    enabled: !!currentUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("sender_id")
        .eq("receiver_id", currentUserId!)
        .eq("read", false);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((m: { sender_id: string }) => {
        counts[m.sender_id] = (counts[m.sender_id] || 0) + 1;
      });
      return counts;
    },
  });

  // Realtime: whenever a new inbound message arrives, refresh the unread count.
  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase
      .channel(`global-incoming-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${currentUserId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          // If the chat is open on this exact conversation, mark it read instead.
          if (open && selectedContactId === msg.sender_id) {
            markConversationRead(msg.sender_id);
          } else {
            queryClient.invalidateQueries({ queryKey: unreadQueryKey });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, open, selectedContactId]);

  const totalUnread = useMemo(
    () => Object.values(unread).reduce((a, b) => a + b, 0),
    [unread],
  );

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

  const markConversationRead = async (contactId: string) => {
    if (!currentUserId) return;
    const { error } = await supabase
      .from("messages")
      .update({ read: true })
      .eq("sender_id", contactId)
      .eq("receiver_id", currentUserId)
      .eq("read", false);
    if (error) {
      console.error("mark as read error:", error);
      return;
    }
    queryClient.invalidateQueries({ queryKey: unreadQueryKey });
  };

  const handleSelectContact = (id: string) => {
    setSelectedContactId(id);
    markConversationRead(id);
  };


  if (!currentUserId) return null;

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-6 right-6 z-50 size-14 rounded-full shadow-xl flex items-center justify-center transition-all",
          "bg-primary text-primary-foreground hover:scale-105 active:scale-95",
        )}
        aria-label={open ? "Minimizar chat" : "Abrir chat"}
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
        {!open && totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-background">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>

      {/* Chat Window */}
      <div
        className={cn(
          "fixed bottom-24 right-6 z-50 w-80 h-[500px] bg-surface border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden transition-all origin-bottom-right",
          open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none",
        )}
      >
        {selectedContact ? (
          <ConversationView
            currentUserId={currentUserId}
            contact={selectedContact}
            isOnline={onlineIds.has(selectedContact.id)}
            onBack={() => setSelectedContactId(null)}
          />
        ) : (
          <ContactsList
            contacts={contacts}
            onlineIds={onlineIds}
            search={search}
            setSearch={setSearch}
            unread={unread}
            onSelect={handleSelectContact}
          />
        )}
      </div>
    </>
  );
}

function ContactsList({
  contacts,
  onlineIds,
  search,
  setSearch,
  unread,
  onSelect,
}: {
  contacts: any[];
  onlineIds: Set<string>;
  search: string;
  setSearch: (v: string) => void;
  unread: Record<string, number>;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <header className="px-4 py-3 border-b border-border flex items-center gap-2 bg-surface/80">
        <MessageCircle className="size-4 text-primary" />
        <h3 className="font-display font-bold text-sm flex-1">Conversas</h3>
      </header>
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar contato..."
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <ul className="p-2 space-y-0.5">
          {contacts.map((c: any) => {
            const isOnline = onlineIds.has(c.id);
            const name = c.display_name || c.full_name || "Sem nome";
            const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
            const count = unread[c.id] || 0;
            return (
              <li key={c.id}>
                <button
                  onClick={() => onSelect(c.id)}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-white/5 text-left transition-colors"
                >
                  <div className="relative shrink-0">
                    <Avatar className="size-9">
                      {c.avatar_url && <AvatarImage src={c.avatar_url} alt={name} />}
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <span
                      className={cn(
                        "absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-surface",
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
                  {count > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
          {contacts.length === 0 && (
            <li className="px-3 py-8 text-center text-xs text-muted-foreground">
              Nenhum contato encontrado.
            </li>
          )}
        </ul>
      </ScrollArea>
    </>
  );
}

function ConversationView({
  currentUserId,
  contact,
  isOnline,
  onBack,
}: {
  currentUserId: string;
  contact: any;
  isOnline: boolean;
  onBack: () => void;
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

  useEffect(() => {
    const channel = supabase
      .channel(`widget-messages-${currentUserId}-${contactId}`)
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
      <header className="px-3 py-2.5 border-b border-border flex items-center gap-2 bg-surface/80">
        <button
          onClick={onBack}
          className="size-7 rounded-md hover:bg-white/10 flex items-center justify-center transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="relative">
          <Avatar className="size-8">
            {contact.avatar_url && <AvatarImage src={contact.avatar_url} alt={name} />}
            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
          </Avatar>
          <span
            className={cn(
              "absolute bottom-0 right-0 size-2 rounded-full ring-2 ring-surface",
              isOnline ? "bg-green-500" : "bg-muted-foreground/40",
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{name}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
            {isOnline ? "Online agora" : "Offline"}
          </p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-background/30">
        {messages.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-8">
            Nenhuma mensagem ainda. Diga olá! 👋
          </div>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-1.5 text-sm whitespace-pre-wrap break-words",
                  mine
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm",
                )}
              >
                <p>{m.content}</p>
                <p
                  className={cn(
                    "text-[9px] mt-0.5 uppercase tracking-wider",
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

      <footer className="p-2 border-t border-border bg-surface/80">
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
            placeholder="Mensagem..."
            className="flex-1 h-9 text-sm"
            autoFocus
          />
          <Button type="submit" disabled={!draft.trim() || sending} size="icon" className="h-9 w-9 shrink-0">
            <Send className="size-4" />
          </Button>
        </form>
      </footer>
    </>
  );
}
