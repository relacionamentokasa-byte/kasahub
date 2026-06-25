import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getScript, updateScript, deleteScript, listScenes,
  SCRIPT_CONTENT_LABEL, SCRIPT_STATUS_LABEL, SCRIPT_STATUS_COLOR,
  type ScriptContentType, type ScriptPlatform, type ScriptVideoFormat, type ScriptStatus,
} from "@/lib/scripts-api";
import { SOCIAL_LABEL } from "@/lib/editorial-api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ScenesEditor } from "@/components/scripts/ScenesEditor";

export const Route = createFileRoute("/_authenticated/roteiros/$scriptId")({
  head: () => ({ meta: [{ title: "Roteiro — KASA HUB" }] }),
  component: ScriptDetailPage,
});

function ScriptDetailPage() {
  const { scriptId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState<any>(null);

  const { data: script } = useQuery({
    queryKey: ["script", scriptId],
    queryFn: () => getScript(scriptId),
  });

  const { data: scenes = [] } = useQuery({
    queryKey: ["script-scenes", scriptId],
    queryFn: () => listScenes(scriptId),
  });

  useEffect(() => {
    if (script) setForm({
      title: script.title,
      content_type: script.content_type,
      platform: script.platform,
      video_format: script.video_format,
      estimated_duration_sec: script.estimated_duration_sec,
      status: script.status,
    });
  }, [script]);

  const save = useMutation({
    mutationFn: (patch: any) => updateScript(scriptId, patch),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["script", scriptId] }); toast.success("Salvo"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: () => deleteScript(scriptId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["scripts"] }); navigate({ to: "/roteiros" }); },
  });

  if (!script || !form) return <div className="p-8 text-foreground/50">Carregando…</div>;

  const isApproved = form.status === "approved";
  const totalSceneDuration = scenes.reduce((a, s) => a + (s.duration_sec ?? 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/roteiros"><Button variant="ghost" size="icon"><ArrowLeft className="size-4" /></Button></Link>
        <div className="flex-1">
          <p className="text-xs font-mono-kasa text-foreground/40 uppercase">Roteiro</p>
          <h1 className="font-display text-2xl">{form.title || "Sem título"}</h1>
        </div>
        <Badge variant="outline" className={cn(SCRIPT_STATUS_COLOR[form.status as ScriptStatus])}>
          {SCRIPT_STATUS_LABEL[form.status as ScriptStatus]}
        </Badge>
        {script.jobs?.id && (
          <Button variant="outline" size="sm" onClick={() => navigate({ to: "/jobs", search: { openJobId: script.jobs.id } as any })}>
            <ExternalLink className="size-3 mr-1" /> Abrir Job
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-surface border-border p-5 space-y-4 lg:col-span-1">
          <h2 className="font-display text-lg">Informações</h2>

          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              onBlur={() => save.mutate({ title: form.title })}
              className="bg-background"
              disabled={isApproved}
            />
          </div>

          <div className="space-y-2">
            <Label>Cliente</Label>
            <p className="text-sm text-foreground/70 py-2 px-3 bg-background rounded-md border border-border">
              {script.clients?.name ?? "—"} <span className="text-xs text-foreground/40">(herdado do Job)</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.content_type}
                onValueChange={(v) => { setForm({ ...form, content_type: v }); save.mutate({ content_type: v }); }}
                disabled={isApproved}
              >
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SCRIPT_CONTENT_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Plataforma</Label>
              <Select
                value={form.platform}
                onValueChange={(v) => { setForm({ ...form, platform: v }); save.mutate({ platform: v }); }}
                disabled={isApproved}
              >
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SOCIAL_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Duração estimada (s)</Label>
              <Input
                type="number"
                value={form.estimated_duration_sec ?? ""}
                onChange={(e) => setForm({ ...form, estimated_duration_sec: e.target.value ? Number(e.target.value) : null })}
                onBlur={() => save.mutate({ estimated_duration_sec: form.estimated_duration_sec })}
                className="bg-background"
                placeholder={`${totalSceneDuration}`}
                disabled={isApproved}
              />
              <p className="text-[10px] text-foreground/40 font-mono-kasa">Soma das cenas: {totalSceneDuration}s</p>
            </div>
            <div className="space-y-2">
              <Label>Formato</Label>
              <Select
                value={form.video_format ?? "vertical"}
                onValueChange={(v) => { setForm({ ...form, video_format: v }); save.mutate({ video_format: v }); }}
                disabled={isApproved}
              >
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vertical">Vertical (9:16)</SelectItem>
                  <SelectItem value="horizontal">Horizontal (16:9)</SelectItem>
                  <SelectItem value="square">Quadrado (1:1)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => { setForm({ ...form, status: v }); save.mutate({ status: v }); }}
            >
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(SCRIPT_STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="ghost"
            className="text-destructive w-full"
            onClick={() => { if (confirm("Excluir roteiro?")) del.mutate(); }}
          >
            <Trash2 className="size-4 mr-1" /> Excluir roteiro
          </Button>
        </Card>

        <div className="lg:col-span-2">
          <ScenesEditor scriptId={scriptId} scenes={scenes} disabled={isApproved} />
        </div>
      </div>
    </div>
  );
}
