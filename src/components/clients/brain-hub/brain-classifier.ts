import type { Job, Project } from "@/lib/ops-api";
import { MACRO_FRONTS, type FrontClusterData, type MacroFrontId } from "./types";

function normalizeText(text?: string | null): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function matchKeywords(text: string, keywords: string[]): boolean {
  if (!text || keywords.length === 0) return false;
  return keywords.some((kw) => text.includes(kw));
}

export function classifyProject(project: Project): MacroFrontId {
  const nameNorm = normalizeText(project.name);
  const typeNorm = normalizeText((project as any).type);
  const descNorm = normalizeText((project as any).description);
  const fullText = `${nameNorm} ${typeNorm} ${descNorm}`;

  for (const front of MACRO_FRONTS) {
    if (front.id === "general") continue;
    if (matchKeywords(fullText, front.keywords)) {
      return front.id;
    }
  }

  return "general";
}

export function classifyJob(
  job: Job,
  projectMap: Map<string, Project>,
  projectFrontMap: Map<string, MacroFrontId>
): MacroFrontId {
  // 1. Se pertence a um projeto já classificado em frente temática, herda prioritariamente
  if (job.project_id && projectFrontMap.has(job.project_id)) {
    const parentFront = projectFrontMap.get(job.project_id)!;
    if (parentFront !== "general") {
      return parentFront;
    }
  }

  // 2. Classificação pelo serviço associado
  const serviceName = normalizeText((job as any).services?.name);
  const serviceCategory = normalizeText((job as any).services?.category);
  const serviceText = `${serviceName} ${serviceCategory}`;

  if (serviceText.trim()) {
    for (const front of MACRO_FRONTS) {
      if (front.id === "general") continue;
      if (matchKeywords(serviceText, front.keywords)) {
        return front.id;
      }
    }
  }

  // 3. Classificação pelo título do job e tipo de job
  const titleNorm = normalizeText(job.title);
  const typeNorm = normalizeText(job.job_type);
  const descNorm = normalizeText((job as any).description);
  const jobText = `${titleNorm} ${typeNorm} ${descNorm}`;

  for (const front of MACRO_FRONTS) {
    if (front.id === "general") continue;
    if (matchKeywords(jobText, front.keywords)) {
      return front.id;
    }
  }

  return "general";
}

export function buildFrontClusters(
  projects: Project[],
  jobs: Job[]
): FrontClusterData[] {
  const projectMap = new Map<string, Project>();
  const projectFrontMap = new Map<string, MacroFrontId>();

  projects.forEach((p) => {
    projectMap.set(p.id, p);
    const frontId = classifyProject(p);
    projectFrontMap.set(p.id, frontId);
  });

  const clustersMap = new Map<MacroFrontId, { projects: Project[]; jobs: Job[] }>();
  MACRO_FRONTS.forEach((f) => {
    clustersMap.set(f.id, { projects: [], jobs: [] });
  });

  // Distribuir projetos
  projects.forEach((p) => {
    const frontId = projectFrontMap.get(p.id) || "general";
    clustersMap.get(frontId)?.projects.push(p);
  });

  // Distribuir jobs
  const todayStr = new Date().toISOString().split("T")[0];
  jobs.forEach((j) => {
    const frontId = classifyJob(j, projectMap, projectFrontMap);
    clustersMap.get(frontId)?.jobs.push(j);
  });

  const result: FrontClusterData[] = [];

  MACRO_FRONTS.forEach((config) => {
    const cluster = clustersMap.get(config.id) || { projects: [], jobs: [] };
    const clusterJobs = cluster.jobs;
    const clusterProjects = cluster.projects;

    // Calcular estatísticas da frente
    let completed = 0;
    let inProgress = 0;
    let review = 0;
    let notStarted = 0;
    let overdue = 0;

    clusterJobs.forEach((job) => {
      const isDone = job.status === "done" || (job as any).job_stages?.is_done;
      if (isDone) {
        completed++;
      } else {
        if (job.status === "in_progress") inProgress++;
        else if (job.status === "review") review++;
        else notStarted++;

        if (job.due_date && job.due_date < todayStr) {
          overdue++;
        }
      }
    });

    const total = clusterJobs.length;
    const progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    result.push({
      config,
      projects: clusterProjects,
      jobs: clusterJobs,
      stats: {
        total,
        completed,
        inProgress,
        review,
        notStarted,
        overdue,
        progressPercentage,
      },
    });
  });

  return result;
}
