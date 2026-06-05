import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchApproval,
  fetchApprovalAssets,
  fetchApprovalComments,
  updateApprovalStatus,
  addApprovalComment,
  uploadApprovalAsset,
  STATUS_LABEL,
  STATUS_COLOR,
  type ApprovalStatus,
} from "@/lib/approvals-api";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, MessageSquareWarning, Upload, Send, Calendar } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  approvalId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  asClient?: boolean;
}

export function ApprovalSheet({ approvalId, open, onOpenChange, asClient }: Props) {
  const qc = useQueryClient();
  const [comment, setComment] = useState("");

  const { data: approval } = useQuery({
    queryKey: ["approval", approvalId],
    queryFn: () => fetchApproval(approvalId!),
    enabled: !!approvalId,
  });
  const { data: assets = [] } = useQuery({
    queryKey: ["approval-assets", approvalId],
    queryFn: () => fetchApprovalAssets(approvalId!),
    enabled: !!approvalId,
  });
  const { data: comments = [] } = useQuery({
    queryKey: ["approval-comments", approvalId],
    queryFn: () => fetchApprovalComments(approvalId!),
    enabled: !!approvalId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["approval", approvalId] });
    qc.invalidateQueries({ queryKey: ["approval-assets", approvalId] });
    qc.invalidateQueries({ queryKey: ["approval-comments", approvalId] });
    qc.invalidateQueries({ queryKey: ["approvals"] });
  };

  const statusMut = useMutation({
    mutationFn: (status: ApprovalStatus) => updateApprovalStatus(approvalId!, status),
    onSuccess: () => {
      invalidate();
      toast.success("Status atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const commentMut = useMutation({
    mutationFn: (isChange: boolean) =>
      addApprovalComment({
        approval_id: approvalId!,
        body: comment,
        is_change_request: isChange,
        author_role: asClient ? "client" : "team",
      }),
    onSuccess: () => {
      setComment("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadMut = useMutation({
    mutationFn: async (files: FileList) => {
      const version = (approval?.current_version ?? 0) + 1;
      for (let i = 0; i < files.length; i++) {
        await uploadApprovalAsset(approvalId!, files[i], version);
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success("Nova versão enviada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const currentVersionAssets = assets.filter((a) => a.version === approval?.current_version);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-surface border-border w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="font-display text-2xl text-left">{approval?.title}</SheetTitle>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {approval && (
                  <Badge variant="outline" className={cn("text-[10px] capitalize-kasa border", STATUS_COLOR[approval.status])}>
                    {STATUS_LABEL[approval.status]}
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px] font-mono-kasa uppercase">
                  v{approval?.current_version}
                </Badge>
                <Badge variant="outline" className="text-[10px] font-mono-kasa uppercase">
                  {approval?.kind}
                </Badge>
              </div>
              {approval?.scheduled_for && (
                <p className="text-xs text-foreground/50 mt-2 flex items-center gap-1.5">
                  <Calendar className="size-3" />
                  Agendado para {new Date(approval.scheduled_for).toLocaleString("pt-BR")}
                </p>
              )}
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="preview" className="mt-6">
          <TabsList className="bg-background">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="comments">Comentários ({comments.length})</TabsTrigger>
            <TabsTrigger value="versions">Versões ({assets.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="space-y-4 mt-4">
            {currentVersionAssets.length === 0 ? (
              <div className="aspect-square rounded-xl bg-muted/30 border border-dashed border-border flex items-center justify-center text-foreground/40">
                Sem mídia ainda
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {currentVersionAssets.map((a) => (
                  <div key={a.id} className="rounded-xl overflow-hidden bg-black border border-border">
                    {a.mime_type?.startsWith("video") ? (
                      <video src={a.url} controls className="w-full" />
                    ) : (
                      <img src={a.url} alt="" className="w-full h-auto" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {approval?.caption && (
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-[10px] font-mono-kasa capitalize text-foreground/40 mb-2">Legenda</p>
                <p className="text-sm whitespace-pre-wrap">{approval.caption}</p>
              </div>
            )}

            {!asClient && (
              <label className="flex items-center justify-center gap-2 border border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="size-4" />
                <span className="text-sm">Enviar nova versão</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => e.target.files && uploadMut.mutate(e.target.files)}
                />
              </label>
            )}

            <div className="flex gap-2 pt-2">
              {asClient ? (
                <>
                  <Button
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black"
                    onClick={() => statusMut.mutate("approved")}
                    disabled={approval?.status === "approved"}
                  >
                    <CheckCircle2 className="size-4 mr-2" />
                    Aprovar
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => statusMut.mutate("changes_requested")}
                  >
                    <MessageSquareWarning className="size-4 mr-2" />
                    Pedir ajustes
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => statusMut.mutate("pending")}>Aguardando</Button>
                  <Button variant="outline" size="sm" onClick={() => statusMut.mutate("approved")}>Aprovar</Button>
                  <Button variant="outline" size="sm" onClick={() => statusMut.mutate("published")}>Publicar</Button>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="comments" className="space-y-3 mt-4">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    "rounded-lg p-3 border",
                    c.is_change_request
                      ? "bg-orange-500/10 border-orange-500/30"
                      : c.author_role === "client"
                      ? "bg-primary/5 border-primary/20"
                      : "bg-background border-border"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[9px] font-mono-kasa uppercase">
                      {c.author_role === "client" ? "Cliente" : "Time"}
                    </Badge>
                    {c.is_change_request && (
                      <Badge variant="outline" className="text-[9px] bg-orange-500/15 text-orange-300 border-orange-500/30">
                        Ajuste solicitado
                      </Badge>
                    )}
                    <span className="text-[10px] text-foreground/40 ml-auto">
                      {new Date(c.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                </div>
              ))}
              {!comments.length && (
                <p className="text-sm text-foreground/40 text-center py-6">Nenhum comentário ainda</p>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <Textarea
                placeholder="Escreva um comentário..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="bg-background"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => commentMut.mutate(false)}
                  disabled={!comment.trim() || commentMut.isPending}
                >
                  <Send className="size-3 mr-2" />
                  Comentar
                </Button>
                {asClient && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => commentMut.mutate(true)}
                    disabled={!comment.trim() || commentMut.isPending}
                  >
                    <MessageSquareWarning className="size-3 mr-2" />
                    Solicitar ajuste
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="versions" className="space-y-3 mt-4">
            {Array.from(new Set(assets.map((a) => a.version)))
              .sort((a, b) => b - a)
              .map((v) => (
                <div key={v} className="border border-border rounded-lg p-3">
                  <p className="text-xs font-mono-kasa uppercase text-foreground/40 mb-2">Versão {v}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {assets
                      .filter((a) => a.version === v)
                      .map((a) => (
                        <a
                          key={a.id}
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="aspect-square rounded overflow-hidden bg-muted block"
                        >
                          {a.mime_type?.startsWith("video") ? (
                            <video src={a.url} className="w-full h-full object-cover" />
                          ) : (
                            <img src={a.url} className="w-full h-full object-cover" alt="" />
                          )}
                        </a>
                      ))}
                  </div>
                </div>
              ))}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
