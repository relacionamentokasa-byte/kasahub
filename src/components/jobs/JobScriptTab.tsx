import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Loader2, Download } from "lucide-react";
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
        <FileText className="size-10 text-primary mx-auto" />
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

  return <ScriptEditor scriptId={script.id} />;
}

function ScriptEditor({ scriptId }: { scriptId: string }) {
  const qc = useQueryClient();
  const { data: scenes = [] } = useQuery({
    queryKey: ["script-scenes", scriptId],
    queryFn: () => listScenes(scriptId),
  });
  const { data: script } = useQuery({
    queryKey: ["script-by-job-detail", scriptId],
    queryFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.from("scripts").select("*").eq("id", scriptId).single();
      if (error) throw error;
      return data as any;
    },
  });

  const [local, setLocal] = useState<any>(null);
  const current = local ?? script;

  const save = useMutation({
    mutationFn: (patch: any) => updateScript(scriptId, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["script-by-job-detail", scriptId] });
      qc.invalidateQueries({ queryKey: ["script-by-job"] });
    },
  });

  if (!current) return null;

  const patch = (p: any) => {
    setLocal({ ...current, ...p });
    save.mutate(p);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-background/50 border-border p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-1">
            <Label className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest">Título</Label>
            <Input
              value={current.title}
              onChange={(e) => setLocal({ ...current, title: e.target.value })}
              onBlur={() => current.title !== script?.title && save.mutate({ title: current.title })}
              className="bg-background font-display text-lg"
            />
          </div>
          <Badge className={SCRIPT_STATUS_COLOR[current.status as ScriptStatus]}>
            {SCRIPT_STATUS_LABEL[current.status as ScriptStatus]}
          </Badge>
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

      <ScenesEditor scriptId={scriptId} scenes={scenes} disabled={current.status === "approved"} />
    </div>
  );
}
