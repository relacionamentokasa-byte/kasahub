import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clapperboard, Plus, Loader2, Download, Play, CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { exportScriptPDF } from "@/lib/script-export";
import {
  getScriptByJob,
  createScript,
  updateScript,
  listScenes,
  type ScriptContentType,
  type ScriptPlatform,
  type ScriptStatus,
  type ScriptVideoFormat,
  SCRIPT_CONTENT_LABEL,
  SCRIPT_STATUS_LABEL,
  SCRIPT_STATUS_COLOR,
} from "@/lib/scripts-api";
import { ScenesEditor } from "@/components/scripts/ScenesEditor";
import { ScriptPresentation } from "@/components/scripts/ScriptPresentation";
import { createEditorialPost, type SocialNetwork, type EditorialContentType } from "@/lib/editorial-api";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  jobId: string;
  defaultTitle: string;
}

export function JobScriptTab({ jobId, defaultTitle }: Props) {
  const qc = useQueryClient();
  const { data: script, isLoading } = useQuery({
    queryKey: ["script-by-job", jobId],
    queryFn: () => getScriptByJob(jobId),
  });

  const create = useMutation({
    mutationFn: () =>
      createScript({
        job_id: jobId,
        title: defaultTitle || "Novo roteiro",
        content_type: "reels",
        platform: "instagram",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["script-by-job", jobId] });
      toast.success("Roteiro criado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-foreground/50">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (!script) {
    return (
      <Card className="bg-background/50 border-dashed border-border p-8 text-center space-y-4">
        <Clapperboard className="size-10 text-primary mx-auto" />
        <div>
          <h3 className="font-display text-lg">Nenhum roteiro neste job</h3>
          <p className="text-sm text-foreground/60">Crie um roteiro vinculado a este job para organizar as cenas e produção.</p>
        </div>
        <Button onClick={() => create.mutate()} disabled={create.isPending}>
          <Plus className="size-4 mr-1" />
          {create.isPending ? "Criando..." : "Criar roteiro"}
        </Button>
      </Card>
    );
  }

  return <ScriptEditor scriptId={script.id} jobId={jobId} />;
}

// Map script content_type → editorial content_type
const CONTENT_MAP: Record<ScriptContentType, EditorialContentType> = {
  reels: "reels",
  youtube: "reels",
  story: "static",
  live: "reels",
  event: "static",
  institutional: "static",
  other: "static",
};

async function autoTickScriptChecklist(jobId: string) {
  const { data } = await supabase
    .from("job_checklist")
    .select("id, content, done")
    .eq("job_id", jobId);
  const targets = (data ?? []).filter((it: any) =>
    !it.done && /roteiro/i.test(it.content ?? "")
  );
  if (targets.length === 0) return 0;
  await supabase.from("job_checklist").update({ done: true } as any).in("id", targets.map((t: any) => t.id));
  return targets.length;
}

function ScriptEditor({ scriptId, jobId }: { scriptId: string; jobId: string }) {
  const qc = useQueryClient();
  const [presenting, setPresenting] = useState(false);

  const { data: scenes = [] } = useQuery({
    queryKey: ["script-scenes", scriptId],
    queryFn: () => listScenes(scriptId),
  });
  const { data: script } = useQuery({
    queryKey: ["script-by-job-detail", scriptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scripts")
        .select("*, clients(name), jobs(id, title)")
        .eq("id", scriptId)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const [local, setLocal] = useState<any>(null);
  const current = local ?? script;

  const save = useMutation({
    mutationFn: (patch: any) => updateScript(scriptId, patch),
    onSuccess: async (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["script-by-job-detail", scriptId] });
      qc.invalidateQueries({ queryKey: ["script-by-job"] });
      if (vars?.status === "approved" && script?.status !== "approved") {
        const ticked = await autoTickScriptChecklist(jobId);
        qc.invalidateQueries({ queryKey: ["job-checklist", jobId] });
        qc.invalidateQueries({ queryKey: ["jobs"] });
        if (ticked > 0) toast.success(`Roteiro aprovado — ${ticked} item(ns) do checklist marcado(s)`);
        else toast.success("Roteiro aprovado");
      }
    },
  });

  const generatePost = useMutation({
    mutationFn: async () => {
      if (!current?.client_id) throw new Error("Cliente não definido");
      return createEditorialPost({
        client_id: current.client_id,
        job_id: jobId,
        title: current.title,
        scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        social_network: (current.platform === "other" ? "instagram" : current.platform) as SocialNetwork,
        content_type: CONTENT_MAP[current.content_type as ScriptContentType] ?? "reels",
        status: "planned",
        description: `Gerado a partir do roteiro: ${current.title}`,
      });
    },
    onSuccess: () => toast.success("Post criado no calendário editorial"),
    onError: (e: Error) => toast.error(e.message),
  });

  if (!current) return null;

  const patch = (p: any) => {
    setLocal({ ...current, ...p });
    save.mutate(p);
  };

  const isApproved = current.status === "approved";

  return (
    <div className="space-y-6">
      <Card className="bg-background/50 border-border p-4 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] space-y-1">
            <Label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest flex items-center gap-1.5">
              <Clapperboard className="size-3" /> Roteiro
            </Label>
            <Input
              value={current.title}
              onChange={(e) => setLocal({ ...current, title: e.target.value })}
              onBlur={() => current.title !== script?.title && save.mutate({ title: current.title })}
              className="bg-background font-display text-lg"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={SCRIPT_STATUS_COLOR[current.status as ScriptStatus]}>
              {SCRIPT_STATUS_LABEL[current.status as ScriptStatus]}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPresenting(true)}
              disabled={scenes.length === 0}
              title="Tela cheia, uma cena por vez"
            >
              <Play className="size-3 mr-1" /> Apresentação
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportScriptPDF({ script: current as any, scenes })}
            >
              <Download className="size-3 mr-1" /> PDF
            </Button>
            {isApproved && (
              <Button
                size="sm"
                onClick={() => generatePost.mutate()}
                disabled={generatePost.isPending}
                className="bg-primary text-primary-foreground"
              >
                <CalendarPlus className="size-3 mr-1" />
                {generatePost.isPending ? "Gerando..." : "Gerar post"}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest">Tipo</Label>
            <Select value={current.content_type} onValueChange={(v: ScriptContentType) => patch({ content_type: v })}>
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(SCRIPT_CONTENT_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest">Plataforma</Label>
            <Select value={current.platform} onValueChange={(v: ScriptPlatform) => patch({ platform: v })}>
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest">Formato</Label>
            <Select value={current.video_format ?? ""} onValueChange={(v: ScriptVideoFormat) => patch({ video_format: v })}>
              <SelectTrigger className="bg-background"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vertical">Vertical</SelectItem>
                <SelectItem value="horizontal">Horizontal</SelectItem>
                <SelectItem value="square">Quadrado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest">Status</Label>
            <Select value={current.status} onValueChange={(v: ScriptStatus) => patch({ status: v })}>
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(SCRIPT_STATUS_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <ScenesEditor scriptId={scriptId} scenes={scenes} disabled={isApproved} />

      <ScriptPresentation
        open={presenting}
        onOpenChange={setPresenting}
        title={current.title}
        scenes={scenes}
      />
    </div>
  );
}
