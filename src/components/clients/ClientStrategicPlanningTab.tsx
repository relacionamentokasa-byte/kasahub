import { useState, useEffect } from "react";
import {
  Compass,
  Plus,
  Target,
  Sparkles,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  Trash2,
  Edit2,
  Save,
  X,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { type Job, type Project } from "@/lib/ops-api";

export interface StrategicPillar {
  id: string;
  title: string;
  description: string;
  tagColor: string; // hex ou classe
  targetProjectIds?: string[];
}

export interface ClientStrategicPlan {
  cycleTitle: string; // Ex: "Plano Estratégico 2026/2027"
  mainGoal: string; // Ex: "Fortalecimento da marca no mercado nacional, presença técnica na FISP e aceleração do Libus Partner"
  pillars: StrategicPillar[];
}

interface Props {
  clientId: string;
  clientName: string;
  jobs: Job[];
  projects: Project[];
}

const DEFAULT_COLORS = [
  { label: "Ouro Kasa", value: "#FFBC45" },
  { label: "Azul Técnico", value: "#3B82F6" },
  { label: "Verde Crescimento", value: "#10B981" },
  { label: "Púrpura Inovação", value: "#8B5CF6" },
  { label: "Laranja Ação", value: "#F97316" },
];

export function ClientStrategicPlanningTab({
  clientId,
  clientName,
  jobs,
  projects,
}: Props) {
  const storageKey = `kasa-strategic-plan-${clientId}`;

  const [plan, setPlan] = useState<ClientStrategicPlan>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }

    // Inicialização padrão para a Libus ou cliente corporativo
    return {
      cycleTitle: "Planejamento Estratégico 2026/2027",
      mainGoal:
        "Consolidação da liderança em EPIs industriais, ativação do estande FISP e expansão da plataforma Libus Partner.",
      pillars: [
        {
          id: "p1",
          title: "Presença Técnica & Eventos (FISP 2026)",
          description:
            "Cobertura audiovisual, produção de conteúdo técnico, fotos do estande e fortalecimento da marca perante distribuidores.",
          tagColor: "#FFBC45",
          targetProjectIds: projects.filter((p) => p.name.toLowerCase().includes("fisp")).map((p) => p.id),
        },
        {
          id: "p2",
          title: "Plataforma & Ferramentas Digitais",
          description:
            "Evolução contínua do Libus Partner, comparadores técnicos e ferramentas que facilitam a tomada de decisão do cliente.",
          tagColor: "#3B82F6",
          targetProjectIds: projects.filter((p) => p.name.toLowerCase().includes("partner") || p.name.toLowerCase().includes("plataforma")).map((p) => p.id),
        },
        {
          id: "p3",
          title: "Capacitação & Treinamento em Vídeo",
          description:
            "Vídeos práticos sobre uso e diferenciais de capacetes, óculos e proteção respiratória para equipes de segurança e vendas.",
          tagColor: "#10B981",
          targetProjectIds: [],
        },
      ],
    };
  });

  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempCycle, setTempCycle] = useState(plan.cycleTitle);
  const [tempGoal, setTempGoal] = useState(plan.mainGoal);

  const [pillarModalOpen, setPillarModalOpen] = useState(false);
  const [editingPillarId, setEditingPillarId] = useState<string | null>(null);
  const [pillarTitle, setPillarTitle] = useState("");
  const [pillarDesc, setPillarDesc] = useState("");
  const [pillarColor, setPillarColor] = useState(DEFAULT_COLORS[0].value);

  // Salvar no localStorage sempre que mudar
  const persistPlan = (updated: ClientStrategicPlan) => {
    setPlan(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleSaveGoal = () => {
    const updated = {
      ...plan,
      cycleTitle: tempCycle.trim() || "Planejamento Estratégico",
      mainGoal: tempGoal.trim() || "Objetivo geral da conta",
    };
    persistPlan(updated);
    setIsEditingGoal(false);
    toast.success("Objetivo estratégico atualizado!");
  };

  const handleOpenNewPillar = () => {
    setEditingPillarId(null);
    setPillarTitle("");
    setPillarDesc("");
    setPillarColor(DEFAULT_COLORS[plan.pillars.length % DEFAULT_COLORS.length].value);
    setPillarModalOpen(true);
  };

  const handleOpenEditPillar = (p: StrategicPillar) => {
    setEditingPillarId(p.id);
    setPillarTitle(p.title);
    setPillarDesc(p.description);
    setPillarColor(p.tagColor);
    setPillarModalOpen(true);
  };

  const handleSavePillar = () => {
    if (!pillarTitle.trim()) {
      toast.error("Informe o título do pilar");
      return;
    }

    let updatedPillars = [...plan.pillars];
    if (editingPillarId) {
      updatedPillars = updatedPillars.map((p) =>
        p.id === editingPillarId
          ? { ...p, title: pillarTitle.trim(), description: pillarDesc.trim(), tagColor: pillarColor }
          : p
      );
    } else {
      updatedPillars.push({
        id: `p-${Date.now()}`,
        title: pillarTitle.trim(),
        description: pillarDesc.trim(),
        tagColor: pillarColor,
        targetProjectIds: [],
      });
    }

    persistPlan({ ...plan, pillars: updatedPillars });
    setPillarModalOpen(false);
    toast.success(editingPillarId ? "Pilar atualizado!" : "Novo pilar adicionado ao planejamento!");
  };

  const handleDeletePillar = (id: string) => {
    const updated = {
      ...plan,
      pillars: plan.pillars.filter((p) => p.id !== id),
    };
    persistPlan(updated);
    toast.success("Pilar removido");
  };

  return (
    <div className="space-y-6 animate-reveal">
      {/* 1. Header do Planejamento: Ciclo & Objetivo Geral */}
      <div className="rounded-xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="size-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Compass className="size-6" />
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-semibold">
                  Plano Diretor de Marketing
                </span>
                <Badge variant="outline" className="text-[10px] font-mono-kasa bg-primary/5 text-primary border-primary/20">
                  {plan.cycleTitle}
                </Badge>
              </div>

              {!isEditingGoal ? (
                <>
                  <h2 className="text-base sm:text-lg font-display font-bold text-foreground tracking-tight">
                    {plan.mainGoal}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Define o foco central de atuação da agência com a diretoria de {clientName}.
                  </p>
                </>
              ) : (
                <div className="space-y-3 pt-2 w-full max-w-2xl">
                  <Input
                    value={tempCycle}
                    onChange={(e) => setTempCycle(e.target.value)}
                    placeholder="Nome do Ciclo (ex: Plano 2026/2027)"
                    className="text-xs h-8 font-mono-kasa bg-background"
                  />
                  <Textarea
                    value={tempGoal}
                    onChange={(e) => setTempGoal(e.target.value)}
                    placeholder="Objetivo principal acordado com o cliente..."
                    rows={2}
                    className="text-xs bg-background"
                  />
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={handleSaveGoal} className="h-7 text-xs font-semibold gap-1">
                      <Save className="size-3" /> Salvar Objetivo
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingGoal(false)}
                      className="h-7 text-xs"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {!isEditingGoal && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTempCycle(plan.cycleTitle);
                  setTempGoal(plan.mainGoal);
                  setIsEditingGoal(true);
                }}
                className="h-8 text-xs font-mono-kasa gap-1.5"
              >
                <Edit2 className="size-3.5" />
                Editar Objetivo
              </Button>
              <Button
                size="sm"
                onClick={handleOpenNewPillar}
                className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground"
              >
                <Plus className="size-3.5" />
                Novo Pilar
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Os Pilares Estratégicos (Cards Executivos) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="size-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground uppercase font-mono-kasa tracking-wide">
              Pilares de Atuação ({plan.pillars.length})
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">
            As grandes frentes de marketing que norteiam as entregas da conta
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plan.pillars.map((pillar, idx) => {
            // Identificar projetos e jobs vinculados a este pilar
            const pillarProjects = projects.filter((proj) =>
              pillar.targetProjectIds?.includes(proj.id) ||
              proj.name.toLowerCase().includes(pillar.title.toLowerCase().slice(0, 5))
            );

            const pillarJobs = jobs.filter((j) =>
              pillarProjects.some((p) => p.id === j.project_id) ||
              j.title.toLowerCase().includes(pillar.title.toLowerCase().slice(0, 5))
            );

            const completedJobs = pillarJobs.filter((j) => j.status === "done" || (j as any).job_stages?.is_done);

            return (
              <div
                key={pillar.id}
                className="rounded-xl border border-border/70 bg-card p-5 hover:border-border hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Cabeçalho do Pilar */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="size-3 rounded-full"
                        style={{ backgroundColor: pillar.tagColor }}
                      />
                      <span className="text-[10px] font-mono-kasa uppercase tracking-wider text-muted-foreground font-bold">
                        Pilar 0{idx + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleOpenEditPillar(pillar)}
                        className="p-1 text-muted-foreground hover:text-foreground rounded"
                        title="Editar pilar"
                      >
                        <Edit2 className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePillar(pillar.id)}
                        className="p-1 text-muted-foreground hover:text-red-500 rounded"
                        title="Excluir pilar"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-display font-bold text-base text-foreground leading-snug">
                      {pillar.title}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-3 mt-1.5 leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>
                </div>

                {/* Status e Entregas deste Pilar */}
                <div className="pt-3 border-t border-border/60 space-y-2 font-mono-kasa text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Briefcase className="size-3" /> Entregas Ativas
                    </span>
                    <span className="font-bold text-foreground">
                      {completedJobs.length}/{pillarJobs.length > 0 ? pillarJobs.length : "—"}
                    </span>
                  </div>

                  {pillarProjects.length > 0 && (
                    <div className="text-[10px] text-muted-foreground truncate">
                      Projeto base: {pillarProjects[0].name}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Card para Adicionar Novo Pilar */}
          <button
            type="button"
            onClick={handleOpenNewPillar}
            className="rounded-xl border border-dashed border-border/80 bg-muted/5 hover:bg-muted/15 p-6 flex flex-col items-center justify-center text-center space-y-2 cursor-pointer transition-colors min-h-[200px]"
          >
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Plus className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Novo Pilar Estratégico</p>
              <p className="text-[10px] font-mono-kasa text-muted-foreground mt-0.5">
                Ex: Lançamento de Produto, Trade PDV, Performance
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Diálogo de Criar / Editar Pilar */}
      <Dialog open={pillarModalOpen} onOpenChange={setPillarModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Target className="size-4 text-primary" />
              {editingPillarId ? "Editar Pilar Estratégico" : "Novo Pilar Estratégico"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Título do Pilar</label>
              <Input
                value={pillarTitle}
                onChange={(e) => setPillarTitle(e.target.value)}
                placeholder="Ex: Treinamento Técnico e Vídeos de EPIs"
                className="text-xs bg-muted/10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Descrição / Por que é importante?</label>
              <Textarea
                value={pillarDesc}
                onChange={(e) => setPillarDesc(e.target.value)}
                placeholder="Explique o que será executado e qual o resultado esperado para a diretoria..."
                rows={3}
                className="text-xs bg-muted/10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Cor de Identificação</label>
              <div className="flex items-center gap-2">
                {DEFAULT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setPillarColor(c.value)}
                    className="size-6 rounded-full border border-border/80 transition-transform flex items-center justify-center"
                    style={{ backgroundColor: c.value }}
                  >
                    {pillarColor === c.value && <CheckCircle2 className="size-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setPillarModalOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSavePillar} className="text-xs font-semibold bg-primary text-primary-foreground">
              {editingPillarId ? "Salvar Alterações" : "Criar Pilar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
