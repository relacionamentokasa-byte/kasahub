import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import {
  Bot, Plus, Trash2, Send, Loader2, Sparkles, Pin, PinOff,
  BookOpen, User as UserIcon, PanelRightClose, PanelRightOpen, Star, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ClientPicker } from "@/components/clients/ClientPicker";
import {
  listThreads, createThread, deleteThread, renameThread, togglePinThread,
  fetchMessages, insertMessage, type AiThread, type AiMessage,
} from "@/lib/kasa-ai-api";
import { listKbDocuments, createKbDocument, KB_CATEGORIES, type KbDocument } from "@/lib/kb-api";
import { sendChatMessage } from "@/lib/kasa-ai.functions";

export const Route = createFileRoute("/_authenticated/kasa-ai/")({
  head: () => ({
    meta: [
      { title: "Kasa AI — Assistente da agência" },
      { name: "description", content: "Assistente operacional inteligente para agências de marketing dentro do Kasa Hub." },
    ],
  }),
  component: KasaAIPage,
});

const MODELS = [
  { id: "openai/gpt-5.5", label: "GPT-5.5 (padrão)" },
  { id: "openai/gpt-5.4", label: "GPT-5.4" },
  { id: "openai/gpt-5.4-mini", label: "GPT-5.4 mini (rápido)" },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro" },
  { id: "google/gemini-3.6-flash", label: "Gemini 3.6 Flash" },
];

function KasaAIPage() {
  const qc = useQueryClient();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [knowledgeIds, setKnowledgeIds] = useState<string[]>([]);
  const [model, setModel] = useState<string>(MODELS[0].id);
  const [contextOpen, setContextOpen] = useState(true);
  const [kbOpen, setKbOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState<null | { content: string }>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const send = useServerFn(sendChatMessage);

  const threadsQ = useQuery({ queryKey: ["ai-threads"], queryFn: listThreads });
  const messagesQ = useQuery({
    queryKey: ["ai-messages", threadId],
    queryFn: () => (threadId ? fetchMessages(threadId) : Promise.resolve([] as AiMessage[])),
    enabled: !!threadId,
  });

  // Auto-select first thread
  useEffect(() => {
    if (!threadId && threadsQ.data?.length) {
      setThreadId(threadsQ.data[0].id);
    }
  }, [threadsQ.data, threadId]);

  // Focus & scroll
  useEffect(() => { inputRef.current?.focus(); }, [threadId]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messagesQ.data?.length]);

  const newThreadMut = useMutation({
    mutationFn: () => createThread("Nova conversa"),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ["ai-threads"] });
      setThreadId(t.id);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteThread(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-threads"] });
      setThreadId(null);
    },
  });

  const pinMut = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) => togglePinThread(id, pinned),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-threads"] }),
  });

  const renameMut = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => renameThread(id, title),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-threads"] }),
  });

  const chatMut = useMutation({
    mutationFn: async (payload: { text: string; tid: string }) => {
      const history = messagesQ.data ?? [];
      await insertMessage({ thread_id: payload.tid, role: "user", content: payload.text });
      const messages = [
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: payload.text },
      ];
      const res = await send({
        data: {
          messages,
          clientId: clientId || null,
          knowledgeIds: knowledgeIds.length ? knowledgeIds : undefined,
          model,
        },
      });
      await insertMessage({
        thread_id: payload.tid,
        role: "assistant",
        content: res.content,
        context_used: { sources: res.sources },
        model: res.model,
      });
      // Auto-title
      const curr = threadsQ.data?.find((t) => t.id === payload.tid);
      if (curr && curr.title === "Nova conversa") {
        const title = payload.text.slice(0, 60);
        await renameThread(payload.tid, title);
        qc.invalidateQueries({ queryKey: ["ai-threads"] });
      }
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-messages", threadId] });
      qc.invalidateQueries({ queryKey: ["ai-threads"] });
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao enviar mensagem"),
  });

  async function sendText(raw: string) {
    const text = raw.trim();
    if (!text) return;
    let tid = threadId;
    if (!tid) {
      const t = await createThread("Nova conversa");
      qc.invalidateQueries({ queryKey: ["ai-threads"] });
      setThreadId(t.id);
      tid = t.id;
    }
    setInput("");
    chatMut.mutate({ text, tid });
  }

  async function handleSend() {
    await sendText(input);
  }

  const lastAssistant = useMemo(() => {
    const msgs = messagesQ.data ?? [];
    for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].role === "assistant") return msgs[i];
    return null;
  }, [messagesQ.data]);

  const lastSources: any[] = (lastAssistant?.context_used as any)?.sources ?? [];

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 overflow-hidden bg-background">
      {/* Sidebar de threads */}
      <aside className="w-64 shrink-0 border-r bg-muted/30 flex flex-col">
        <div className="p-3 border-b flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="font-bold">Kasa AI</span>
        </div>
        <div className="p-3">
          <Button size="sm" className="w-full" onClick={() => newThreadMut.mutate()}>
            <Plus className="h-4 w-4 mr-1" /> Nova conversa
          </Button>
        </div>
        <ScrollArea className="flex-1 px-2 pb-2">
          {threadsQ.isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Carregando…</div>
          ) : threadsQ.data?.length === 0 ? (
            <div className="p-4 text-xs text-muted-foreground">Nenhuma conversa ainda.</div>
          ) : (
            <div className="space-y-1">
              {threadsQ.data?.map((t) => (
                <ThreadItem
                  key={t.id}
                  thread={t}
                  active={t.id === threadId}
                  onSelect={() => setThreadId(t.id)}
                  onDelete={() => deleteMut.mutate(t.id)}
                  onPin={(p) => pinMut.mutate({ id: t.id, pinned: p })}
                  onRename={(title) => renameMut.mutate({ id: t.id, title })}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </aside>

      {/* Chat principal */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b px-4 py-2 flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px] flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Cliente:</span>
            <div className="flex-1 max-w-xs">
              <ClientPicker value={clientId} onChange={setClientId} allowClear placeholder="Nenhum" />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setKbOpen(true)}>
            <BookOpen className="h-4 w-4 mr-1" />
            Biblioteca {knowledgeIds.length > 0 && <Badge className="ml-2">{knowledgeIds.length}</Badge>}
          </Button>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MODELS.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={() => setContextOpen((v) => !v)} title="Painel de contexto">
            {contextOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </Button>
        </div>

        {/* Mensagens */}
        <ScrollArea className="flex-1" ref={scrollRef as any}>
          <div className="max-w-3xl mx-auto p-6 space-y-6">
            {(!messagesQ.data || messagesQ.data.length === 0) && !chatMut.isPending ? (
              <EmptyState onPick={(s: string) => { sendText(s); }} />
            ) : (
              messagesQ.data?.map((m) => (
                <MessageBubble key={m.id} message={m} onSaveKnowledge={(c) => setSaveOpen({ content: c })} />
              ))
            )}
            {chatMut.isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Kasa AI está pensando…
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Composer */}
        <div className="border-t p-3">
          <div className="max-w-3xl mx-auto">
            {(clientId || knowledgeIds.length > 0) && (
              <div className="flex gap-1 flex-wrap mb-2">
                {clientId && (
                  <Badge variant="secondary" className="gap-1">
                    <UserIcon className="h-3 w-3" /> Cliente vinculado
                    <button onClick={() => setClientId("")}><X className="h-3 w-3" /></button>
                  </Badge>
                )}
                {knowledgeIds.length > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <BookOpen className="h-3 w-3" /> {knowledgeIds.length} referência(s)
                    <button onClick={() => setKnowledgeIds([])}><X className="h-3 w-3" /></button>
                  </Badge>
                )}
              </div>
            )}
            <div className="flex gap-2 items-end">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Pergunte, peça um calendário, roteiro, briefing... (Enter para enviar, Shift+Enter para nova linha)"
                className="min-h-[60px] max-h-[200px] resize-none"
                disabled={chatMut.isPending}
              />
              <Button onClick={handleSend} disabled={chatMut.isPending || !input.trim()} size="lg">
                {chatMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Painel de contexto */}
      {contextOpen && (
        <aside className="w-80 shrink-0 border-l bg-muted/20 flex flex-col">
          <div className="p-3 border-b">
            <div className="font-semibold text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Fontes utilizadas
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Informações que o Kasa AI acessou para gerar a última resposta.
            </p>
          </div>
          <ScrollArea className="flex-1 p-3">
            {lastSources.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhuma fonte externa foi consultada ainda. Vincule um cliente ou adicione documentos da Biblioteca para enriquecer as respostas.
              </p>
            ) : (
              <div className="space-y-2">
                {lastSources.map((s, i) => (
                  <Card key={i} className="p-3 text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px]">{s.kind}</Badge>
                      <div className="font-semibold truncate">{s.label}</div>
                    </div>
                    {s.snippet && <div className="text-muted-foreground line-clamp-4">{s.snippet}</div>}
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </aside>
      )}

      {/* Dialog: selecionar da biblioteca */}
      <KbPickerDialog
        open={kbOpen}
        onOpenChange={setKbOpen}
        selected={knowledgeIds}
        onChange={setKnowledgeIds}
      />

      {/* Dialog: salvar como conhecimento */}
      <SaveKnowledgeDialog
        open={!!saveOpen}
        content={saveOpen?.content ?? ""}
        onOpenChange={(o) => !o && setSaveOpen(null)}
      />
    </div>
  );
}

function ThreadItem({
  thread, active, onSelect, onDelete, onPin, onRename,
}: {
  thread: AiThread;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onPin: (p: boolean) => void;
  onRename: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(thread.title);
  return (
    <div
      onClick={onSelect}
      className={cn(
        "group rounded-md px-2 py-2 cursor-pointer text-sm flex items-center gap-2",
        active ? "bg-primary/10 text-primary" : "hover:bg-muted",
      )}
    >
      {thread.pinned && <Pin className="h-3 w-3 shrink-0" />}
      {editing ? (
        <Input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => { setEditing(false); if (title !== thread.title) onRename(title); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { setEditing(false); if (title !== thread.title) onRename(title); }
            if (e.key === "Escape") { setEditing(false); setTitle(thread.title); }
          }}
          onClick={(e) => e.stopPropagation()}
          className="h-6 text-xs"
        />
      ) : (
        <span className="flex-1 truncate" onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}>
          {thread.title}
        </span>
      )}
      <button
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
        onClick={(e) => { e.stopPropagation(); onPin(!thread.pinned); }}
        title={thread.pinned ? "Desafixar" : "Fixar"}
      >
        {thread.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
      </button>
      <button
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
        onClick={(e) => { e.stopPropagation(); if (confirm("Excluir conversa?")) onDelete(); }}
        title="Excluir"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

function MessageBubble({
  message, onSaveKnowledge,
}: {
  message: AiMessage;
  onSaveKnowledge: (content: string) => void;
}) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold",
          isUser ? "bg-primary text-primary-foreground" : "bg-gradient-to-br from-primary to-primary/60 text-primary-foreground",
        )}
      >
        {isUser ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={cn("flex-1 min-w-0", isUser && "max-w-[80%]")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm",
            isUser ? "bg-primary text-primary-foreground" : "bg-muted",
          )}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-headings:mt-3 prose-headings:mb-2 prose-ul:my-2 prose-ol:my-2">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>
        {!isUser && (
          <div className="flex gap-2 mt-1 opacity-0 hover:opacity-100 transition">
            <Button
              variant="ghost" size="sm" className="h-7 text-xs"
              onClick={() => { navigator.clipboard.writeText(message.content); toast.success("Copiado"); }}
            >
              Copiar
            </Button>
            <Button
              variant="ghost" size="sm" className="h-7 text-xs"
              onClick={() => onSaveKnowledge(message.content)}
            >
              <Star className="h-3 w-3 mr-1" /> Salvar como Conhecimento
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (s: string) => void }) {
  const suggestions = [
    "Crie um calendário editorial de 4 semanas para o cliente selecionado",
    "Gere um roteiro de reels de 30s sobre lançamento de produto",
    "Escreva um briefing de campanha de aniversário",
    "Sugira 5 ideias de conteúdo alinhadas ao tom de voz do cliente",
  ];
  return (
    <div className="text-center py-16">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 mb-4">
        <Bot className="h-8 w-8 text-primary-foreground" />
      </div>
      <h2 className="text-2xl font-bold">Olá! Sou o Kasa AI</h2>
      <p className="text-muted-foreground mt-2 max-w-md mx-auto">
        Assistente operacional da agência. Vincule um cliente ou documentos da Biblioteca para respostas mais precisas.
      </p>
      <div className="mt-6 grid gap-2 max-w-xl mx-auto">
        {suggestions.map((s) => (
          <Card key={s} onClick={() => onPick(s)} className="p-3 text-sm text-left hover:bg-muted cursor-pointer transition-colors">{s}</Card>
        ))}
      </div>
    </div>
  );
}

function KbPickerDialog({
  open, onOpenChange, selected, onChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const q = useQuery({
    queryKey: ["kb-docs", { search, category }],
    queryFn: () => listKbDocuments({ search: search || undefined, category: category || undefined }),
    enabled: open,
  });
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar referências da Biblioteca</DialogTitle>
          <DialogDescription>Selecione documentos para dar mais contexto ao Kasa AI.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={category || "__all"} onValueChange={(v) => setCategory(v === "__all" ? "" : v)}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Todas as categorias" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todas as categorias</SelectItem>
              {KB_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <ScrollArea className="h-[400px] pr-2">
          {q.isLoading ? (
            <div className="text-sm text-muted-foreground p-4">Carregando…</div>
          ) : q.data?.length === 0 ? (
            <div className="text-sm text-muted-foreground p-4">Nenhum documento. Crie um em Biblioteca.</div>
          ) : (
            <div className="space-y-2">
              {q.data?.map((d) => (
                <Card
                  key={d.id}
                  onClick={() => toggle(d.id)}
                  className={cn(
                    "p-3 cursor-pointer hover:bg-muted",
                    selected.includes(d.id) && "border-primary bg-primary/5",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-sm">{d.title}</div>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="outline" className="text-[10px]">{d.category}</Badge>
                        {d.segment && <Badge variant="outline" className="text-[10px]">{d.segment}</Badge>}
                        {d.tags?.slice(0, 3).map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                        ))}
                      </div>
                      {d.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{d.description}</p>}
                    </div>
                    {selected.includes(d.id) && <Badge className="shrink-0">Selecionado</Badge>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onChange([])}>Limpar</Button>
          <Button onClick={() => onOpenChange(false)}>Confirmar ({selected.length})</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SaveKnowledgeDialog({
  open, content, onOpenChange,
}: {
  open: boolean;
  content: string;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(KB_CATEGORIES[0]);
  const [segment, setSegment] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => { if (open) { setTitle(""); setSegment(""); setTags(""); setCategory(KB_CATEGORIES[0]); } }, [open]);

  const mut = useMutation({
    mutationFn: () => createKbDocument({
      title: title || "Entrega Kasa AI",
      category,
      segment: segment || null,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      description: content.slice(0, 200),
      content,
      source_type: "ai_output",
    }),
    onSuccess: () => {
      toast.success("Salvo na Biblioteca");
      qc.invalidateQueries({ queryKey: ["kb-docs"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Salvar como Conhecimento</DialogTitle>
          <DialogDescription>Adicione este material à Biblioteca da Kasa.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Calendário Kasa Fitness — Nov" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KB_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Segmento</Label>
              <Input value={segment} onChange={(e) => setSegment(e.target.value)} placeholder="fitness, beleza, imob..." />
            </div>
          </div>
          <div>
            <Label>Tags (separadas por vírgula)</Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="lançamento, reels, aniversário" />
          </div>
          <div>
            <Label>Conteúdo</Label>
            <div className="text-xs bg-muted rounded p-2 max-h-40 overflow-auto whitespace-pre-wrap">{content}</div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
