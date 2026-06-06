import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { CheckCircle2, XCircle, Clock, FileText, ExternalLink, MessageSquare, Send, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/approve/$token")({
  component: PublicApprovalPage,
});

function PublicApprovalPage() {
  const { token } = Route.useParams();
  const [feedback, setFeedback] = useState("");

  const { data: job, isLoading, refetch } = useQuery({
    queryKey: ["public-job-approval", token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          *,
          client:clients(name, company),
          project:projects(name),
          attachments:job_attachments(*)
        `)
        .eq("approval_token", token)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const feedbackMut = useMutation({
    mutationFn: async (status: 'done' | 'adjustments') => {
      const { error } = await supabase
        .from("jobs")
        .update({ 
          status, 
          last_feedback: feedback,
          feedback_at: new Date().toISOString()
        })
        .eq("id", job!.id);
      
      if (error) throw error;

      // Log no histórico
      await supabase.from("job_history").insert({
        job_id: job!.id,
        action: 'feedback_received',
        to_value: status,
        metadata: { feedback }
      });
    },
    onSuccess: () => {
      toast.success("Feedback enviado com sucesso!");
      refetch();
    },
    onError: (e: any) => toast.error(e.message)
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Clock className="animate-spin" /></div>;
  if (!job) return <div className="min-h-screen flex items-center justify-center bg-background">Link de aprovação inválido ou expirado.</div>;

  const isResponded = job.status === 'done' || job.status === 'adjustments';

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="text-center space-y-2">
          <div className="inline-block px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase tracking-wider mb-2">
            Portal de Aprovação · KASA HUB
          </div>
          <h1 className="text-3xl font-display font-bold">{job.title}</h1>
          <p className="text-foreground/60">{job.project?.name} · {job.client?.company || job.client?.name}</p>
        </header>

        <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 md:p-8 space-y-8">
            {/* Arquivos para Aprovação */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <FileText className="size-4 text-primary" /> Arquivos para Revisão
              </h3>
              <div className="grid gap-3">
                {job.attachments?.map((att: any) => (
                  <div key={att.id} className="flex items-center justify-between p-4 bg-muted/20 border border-border rounded-xl group hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-background flex items-center justify-center border border-border">
                        <FileText className="size-5 text-foreground/40" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{att.file_name}</p>
                        <p className="text-[10px] text-foreground/40">{format(new Date(att.created_at), "dd/MM/yyyy")}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2" asChild>
                      <a href={att.file_url} target="_blank" rel="noreferrer"><ExternalLink className="size-4" /> Visualizar</a>
                    </Button>
                  </div>
                ))}
                {(!job.attachments || job.attachments.length === 0) && (
                  <p className="text-sm text-foreground/40 italic">Nenhum arquivo anexado.</p>
                )}
              </div>
            </section>

            {/* Briefing da Tarefa */}
            {(job.briefing_objective || job.briefing_guidelines) && (
              <section className="space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Info className="size-4 text-primary" /> Briefing da Tarefa
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {job.briefing_objective && (
                    <div className="p-4 bg-muted/10 rounded-xl space-y-1">
                      <p className="text-[10px] uppercase font-bold text-foreground/40">Objetivo</p>
                      <p className="text-sm">{job.briefing_objective}</p>
                    </div>
                  )}
                  {job.briefing_guidelines && (
                    <div className="p-4 bg-muted/10 rounded-xl space-y-1">
                      <p className="text-[10px] uppercase font-bold text-foreground/40">Diretrizes</p>
                      <p className="text-sm">{job.briefing_guidelines}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Formulário da Tarefa (Dados da Entrega) */}
            {job.custom_form_data && Object.keys(job.custom_form_data).length > 0 && (
              <section className="space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="size-4 text-primary" /> Dados da Entrega
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(job.custom_form_data).map(([key, val]: [string, any]) => (
                    <div key={key} className="p-4 bg-primary/5 border border-primary/10 rounded-xl space-y-1">
                      <p className="text-[10px] uppercase font-bold text-primary/60">{key}</p>
                      <p className="text-sm font-medium">{val || "-"}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Descrição Geral */}
            <section className="space-y-2 p-4 bg-muted/10 rounded-xl">
              <h3 className="text-xs font-semibold text-foreground/50">Descrição Adicional</h3>
              <p className="text-sm leading-relaxed">{job.description || "Nenhuma informação adicional fornecida."}</p>
            </section>

            {/* Ações de Aprovação */}
            {!isResponded ? (
              <section className="space-y-6 pt-6 border-t border-border">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <MessageSquare className="size-4 text-primary" /> Seu Feedback
                  </h3>
                  <Textarea 
                    placeholder="Escreva aqui se deseja solicitar algum ajuste ou apenas deixar um comentário sobre a aprovação..."
                    rows={4}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1 h-12 gap-2 border-red-500/30 text-red-500 hover:bg-red-500/5 hover:text-red-600"
                    onClick={() => feedbackMut.mutate('adjustments')}
                    disabled={feedbackMut.isPending}
                  >
                    <XCircle className="size-5" /> Solicitar Ajustes
                  </Button>
                  <Button 
                    className="flex-1 h-12 gap-2 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => feedbackMut.mutate('done')}
                    disabled={feedbackMut.isPending}
                  >
                    <CheckCircle2 className="size-5" /> Aprovar Entrega
                  </Button>
                </div>
              </section>
            ) : (
              <section className="pt-6 border-t border-border">
                <div className={`p-6 rounded-2xl flex flex-col items-center text-center space-y-3 ${job.status === 'done' ? 'bg-green-500/10 border border-green-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
                  {job.status === 'done' ? (
                    <>
                      <CheckCircle2 className="size-12 text-green-500" />
                      <h3 className="text-xl font-bold text-green-700">Entrega Aprovada!</h3>
                      <p className="text-sm text-green-600/80">Obrigado pelo seu feedback. Nossa equipe já foi notificada.</p>
                    </>
                  ) : (
                    <>
                      <XCircle className="size-12 text-amber-500" />
                      <h3 className="text-xl font-bold text-amber-700">Ajustes Solicitados</h3>
                      <p className="text-sm text-amber-600/80">Recebemos suas solicitações de alteração e vamos trabalhar nelas o quanto antes.</p>
                    </>
                  )}
                  {job.last_feedback && (
                    <div className="mt-4 p-4 bg-white/50 rounded-xl text-left w-full max-w-md">
                      <p className="text-[10px] uppercase font-bold text-foreground/40 mb-1">Seu comentário:</p>
                      <p className="text-sm italic">"{job.last_feedback}"</p>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>

        <footer className="text-center">
          <p className="text-[10px] text-foreground/40 uppercase tracking-widest font-bold">Kasa Marketing Consultoria · ERP Operacional</p>
        </footer>
      </div>
    </div>
  );
}
