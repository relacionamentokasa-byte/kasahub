import React, { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleMentions } from "@/lib/notifications-api";
import { fetchProfiles, type Profile } from "@/lib/profile-api";
import {
  MessageSquare,
  Send,
  AtSign,
  Trash2,
  AlertCircle,
  Sparkles,
  Loader2,
  CheckCircle2,
  User,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface JobCommentItem {
  id: string;
  job_id: string;
  user_id: string;
  content: string;
  type: "comment" | "correction" | "adjustment" | string;
  created_at: string;
  is_system?: boolean;
  metadata?: any;
}

interface JobCommentsSectionProps {
  jobId: string;
  jobTitle: string;
  team: Profile[];
}

export function JobCommentsSection({
  jobId,
  jobTitle,
  team,
}: JobCommentsSectionProps) {
  const qc = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [commentType, setCommentType] = useState<"comment" | "correction">("comment");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionCursorPos, setMentionCursorPos] = useState<number | null>(null);
  const [selectedMentionIdx, setSelectedMentionIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionDropdownRef = useRef<HTMLDivElement>(null);

  // Obter usuário atual logado
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setCurrentUserId(data.user.id);
    });
  }, []);

  // Buscar comentários do Job
  const { data: comments = [], isLoading } = useQuery<JobCommentItem[]>({
    queryKey: ["job_comments", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_comments")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Erro ao buscar comentários do job:", error);
        return [];
      }
      return (data || []) as JobCommentItem[];
    },
    enabled: !!jobId,
  });

  // Mapeamento de perfis para exibição do autor
  const profilesMap = useMemo(() => {
    const map = new Map<string, Profile>();
    team.forEach((p) => map.set(p.id, p));
    return map;
  }, [team]);

  // Filtragem de membros para menção @
  const filteredTeamForMention = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return team
      .filter((p) => {
        const name = (p.display_name || p.full_name || "").toLowerCase();
        return name.includes(q);
      })
      .slice(0, 6);
  }, [team, mentionQuery]);

  // Monitorar digitação para detectar '@'
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart || 0;
    setCommentText(val);

    const textBeforeCursor = val.slice(0, pos);
    const lastAtMatch = textBeforeCursor.match(/@([\p{L}\p{N}_.-]*)$/u);

    if (lastAtMatch) {
      setMentionQuery(lastAtMatch[1] || "");
      setMentionCursorPos(pos);
      setSelectedMentionIdx(0);
    } else {
      setMentionQuery(null);
      setMentionCursorPos(null);
    }
  };

  // Inserir menção selecionada no texto
  const insertMention = (profile: Profile) => {
    const name = profile.display_name || profile.full_name?.split(" ")[0] || "Membro";
    const pos = mentionCursorPos || commentText.length;
    const textBefore = commentText.slice(0, pos);
    const textAfter = commentText.slice(pos);

    // Substituir a query após o @ pelo nome completo da menção
    const replacedBefore = textBefore.replace(/@([\p{L}\p{N}_.-]*)$/u, `@${name} `);
    const newText = replacedBefore + textAfter;

    setCommentText(newText);
    setMentionQuery(null);
    setMentionCursorPos(null);

    // Reposicionar o foco no textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const nextPos = replacedBefore.length;
        textareaRef.current.setSelectionRange(nextPos, nextPos);
      }
    }, 50);
  };

  // Tratar teclado no autocomplete (ArrowUp, ArrowDown, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredTeamForMention.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMentionIdx((prev) => (prev + 1) % filteredTeamForMention.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMentionIdx((prev) =>
          prev > 0 ? prev - 1 : filteredTeamForMention.length - 1
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const target = filteredTeamForMention[selectedMentionIdx];
        if (target) insertMention(target);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    // Envio rápido com Ctrl+Enter ou Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (commentText.trim()) handleSend();
    }
  };

  // Mutation para criar comentário
  const sendCommentMutation = useMutation({
    mutationFn: async (payload: { content: string; type: string }) => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) throw new Error("Usuário não autenticado.");

      const { data, error } = await supabase
        .from("job_comments")
        .insert({
          job_id: jobId,
          user_id: userId,
          content: payload.content,
          type: payload.type,
        })
        .select()
        .single();

      if (error) throw error;

      // Disparar notificações de menção (@)
      await handleMentions(payload.content, {
        title: jobTitle,
        link: `/jobs?jobId=${jobId}`,
        originType: "job",
        originId: jobId,
      });

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job_comments", jobId] });
      qc.invalidateQueries({ queryKey: ["job_timeline", jobId] });
      setCommentText("");
      setCommentType("comment");
      toast.success("Comentário publicado!");
    },
    onError: (err: any) => {
      console.error(err);
      toast.error("Erro ao publicar comentário.");
    },
  });

  // Mutation para deletar comentário
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("job_comments")
        .delete()
        .eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job_comments", jobId] });
      qc.invalidateQueries({ queryKey: ["job_timeline", jobId] });
      toast.success("Comentário removido.");
    },
  });

  const handleSend = () => {
    if (!commentText.trim() || sendCommentMutation.isPending) return;
    sendCommentMutation.mutate({
      content: commentText.trim(),
      type: commentType,
    });
  };

  // Renderizar texto com destaques de @menções
  const renderFormattedContent = (content: string) => {
    const parts = content.split(/(@[\p{L}\p{N}_.-]+)/gu);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return (
          <span
            key={i}
            className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200/80 mx-0.5"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Header da Seção */}
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
            <MessageSquare className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-foreground font-display">
              Comentários & Alinhamento da Equipe
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {comments.length} {comments.length === 1 ? "mensagem registrada" : "mensagens registradas"}
            </p>
          </div>
        </div>
        <span className="text-[11px] font-medium text-muted-foreground font-mono-kasa bg-muted/40 px-2.5 py-1 rounded-md border border-border/40">
          Use @ para mencionar membros
        </span>
      </div>

      {/* Lista de Comentários com mais respiro e altura ampliada */}
      <div className="space-y-3.5 max-h-[500px] min-h-[140px] overflow-y-auto pr-1.5 custom-scrollbar">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2.5">
            <Loader2 className="size-5 animate-spin text-amber-500" />
            <span>Carregando comentários…</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="p-8 bg-muted/15 border border-dashed border-border/70 rounded-2xl text-center space-y-2">
            <div className="size-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-1">
              <MessageSquare className="size-5" />
            </div>
            <p className="text-sm font-bold text-foreground">
              Nenhum comentário neste job ainda
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Deixe um alinhamento sobre a entrega, solicite correções pontuais ou mencione seus colegas de equipe usando @.
            </p>
          </div>
        ) : (
          comments.map((c) => {
            const author = profilesMap.get(c.user_id);
            const authorName =
              author?.display_name || author?.full_name || "Membro da Equipe";
            const isOwner = currentUserId === c.user_id;
            const isCorrection = c.type === "correction";

            return (
              <div
                key={c.id}
                className={`p-4 rounded-xl border text-xs space-y-2.5 transition-all shadow-2xs ${
                  isCorrection
                    ? "bg-amber-500/5 border-amber-500/30 dark:bg-amber-950/25 dark:border-amber-900/60"
                    : "bg-card border-border/70 hover:border-border"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-7 border border-border/70 shrink-0 shadow-2xs">
                      <AvatarImage src={author?.avatar_url || ""} />
                      <AvatarFallback className="text-[11px] bg-muted font-bold text-foreground">
                        {authorName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-xs sm:text-sm">
                        {authorName}
                      </span>

                      {isCorrection && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500 text-white font-mono-kasa uppercase tracking-wider shadow-2xs">
                          Ajuste / Correção
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground font-mono-kasa">
                      {formatDistanceToNow(new Date(c.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>

                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => deleteCommentMutation.mutate(c.id)}
                        disabled={deleteCommentMutation.isPending}
                        className="text-muted-foreground hover:text-rose-500 p-1.5 rounded-md hover:bg-rose-500/10 transition"
                        title="Excluir comentário"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-foreground/90 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap pl-9">
                  {renderFormattedContent(c.content)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Caixa de Criação de Comentário Ampliada */}
      <div className="bg-card border border-border/70 rounded-2xl p-4 space-y-3 relative shadow-xs">
        <div className="flex items-center justify-between">
          {/* Tipo de Comentário */}
          <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl border border-border/40">
            <button
              type="button"
              onClick={() => setCommentType("comment")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                commentType === "comment"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Comentário Geral
            </button>
            <button
              type="button"
              onClick={() => setCommentType("correction")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                commentType === "correction"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Ajuste / Correção</span>
            </button>
          </div>

          <span className="text-[11px] text-muted-foreground font-mono-kasa hidden sm:inline">
            Pressione <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/60 text-[10px] font-semibold">Ctrl+Enter</kbd> para enviar
          </span>
        </div>

        {/* Textarea de Entrada Ampliado com Autocomplete */}
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={commentText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={
              commentType === "correction"
                ? "Descreva com clareza o que precisa ser corrigido e mencione os responsáveis com @..."
                : "Escreva sua mensagem ou mencione colegas com @..."
            }
            rows={4}
            className="w-full text-xs sm:text-sm leading-relaxed resize-y min-h-[90px] bg-muted/15 border-border/70 focus:border-foreground rounded-xl p-3.5 pr-10"
          />

          {/* Popover / Dropdown de Menção @ */}
          {mentionQuery !== null && filteredTeamForMention.length > 0 && (
            <div
              ref={mentionDropdownRef}
              className="absolute left-0 bottom-full mb-2 w-72 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden py-1"
            >
              <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-muted-foreground font-mono-kasa border-b border-border/50">
                Mencionar Colaborador
              </div>
              <div className="max-h-52 overflow-y-auto">
                {filteredTeamForMention.map((member, idx) => {
                  const isSelected = idx === selectedMentionIdx;
                  const name =
                    member.display_name || member.full_name || "Membro";

                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => insertMention(member)}
                      className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center gap-2.5 transition ${
                        isSelected
                          ? "bg-accent text-accent-foreground font-bold"
                          : "text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <Avatar className="size-6 border shrink-0">
                        <AvatarImage src={member.avatar_url || ""} />
                        <AvatarFallback className="text-[10px] font-bold">
                          {name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold leading-tight">{name}</p>
                        {member.job_title && (
                          <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                            {member.job_title}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Barra de Ações Inferior */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => {
              const newText = commentText ? `${commentText} @` : "@";
              setCommentText(newText);
              setMentionQuery("");
              setTimeout(() => textareaRef.current?.focus(), 50);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition flex items-center gap-1.5"
            title="Mencionar alguém"
          >
            <AtSign className="size-4" />
            <span>Mencionar membro</span>
          </button>

          <Button
            type="button"
            onClick={handleSend}
            disabled={!commentText.trim() || sendCommentMutation.isPending}
            className="h-8.5 px-4 text-xs font-bold gap-2 rounded-xl bg-foreground text-background hover:bg-foreground/90 transition shadow-xs"
          >
            {sendCommentMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            <span>Enviar Mensagem</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
