import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { approveExtraDemand as approveExtraDemandShared } from "./dme-approval";
import { handleMentions } from "./notifications-api";

export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type JobStage = Database["public"]["Tables"]["job_stages"]["Row"];
export type Job = Database["public"]["Tables"]["jobs"]["Row"];
export type JobChecklist = Database["public"]["Tables"]["job_checklist"]["Row"];
export type JobComment = Database["public"]["Tables"]["job_comments"]["Row"];

// ---------- Clients ----------
export async function fetchClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchClient(id: string): Promise<Client> {
  const { data, error } = await supabase.from("clients").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function createClient(input: Database["public"]["Tables"]["clients"]["Insert"]) {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("clients")
    .insert({ ...input, owner_id: u.user?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateClient(
  id: string,
  patch: Database["public"]["Tables"]["clients"]["Update"],
) {
  if (patch.status === 'inactive') {
    // Check for active contracts when inactivating
    const { count } = await supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('client_id', id).eq('status', 'active');
    if (count && count > 0) {
      throw new Error("Não é possível inativar um cliente com contratos ativos. Encerre os contratos primeiro.");
    }
  }

  const { data, error } = await supabase.from("clients").update(patch).eq("id", id).select().single();
  if (error) throw error;
  
  await logAudit("update", "client", id, null, patch);
  return data;
}

export async function deleteClient(id: string) {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
  await logAudit("delete", "client", id, null, null);
}

// ---------- Projects ----------
export async function fetchProjects(filters: { clientId?: string; status?: string; type?: string; contractId?: string; search?: string } = {}): Promise<Project[]> {
  let q = supabase.from("projects").select("*").order("created_at", { ascending: false });
  
  if (filters.clientId && filters.clientId !== "all") q = q.eq("client_id", filters.clientId);
  if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
  if (filters.type && filters.type !== "all") q = q.eq("type", filters.type);
  if (filters.contractId && filters.contractId !== "all") q = q.eq("contract_id", filters.contractId);
  
  if (filters.search) {
    q = q.ilike("name", `%${filters.search}%`);
  }
  
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchProject(id: string): Promise<Project> {
  const { data, error } = await supabase.from("projects").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function createProject(input: Database["public"]["Tables"]["projects"]["Insert"]) {
  if (!input.client_id) throw new Error("Um projeto deve estar vinculado a um cliente.");
  
  // Bloquear se cliente estiver inativo
  const client = await fetchClient(input.client_id);
  if (client.status === 'inactive') throw new Error("Não é possível criar projetos para clientes inativos.");

  if (input.type !== 'special' && !input.contract_id) {
    throw new Error("Projetos automáticos devem estar vinculados a um contrato.");
  }

  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("projects")
    .insert({ ...input, owner_id: u.user?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  
  if (data.briefing?.includes('@')) {
    await handleMentions(data.briefing, {
      title: `Projeto: ${data.name}`,
      link: `/projetos/${data.id}`,
      originType: 'projects',
      originId: data.id
    });
  }

  await logAudit("create", "project", data.id, null, data);
  return data;
}

export async function updateProject(
  id: string,
  patch: Database["public"]["Tables"]["projects"]["Update"],
) {
  const { data, error } = await supabase.from("projects").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function refreshProjectStats(projectId: string) {
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("id, done_at, stage_id")
    .eq("project_id", projectId);
  
  if (error) throw error;
  
  const { data: stages } = await supabase.from("job_stages").select("id, is_done");
  const doneStageIds = new Set(stages?.filter(s => s.is_done).map(s => s.id) || []);
  
  const total = jobs.length;
  const done = jobs.filter(j => !!j.done_at || (j.stage_id && doneStageIds.has(j.stage_id))).length;
  
  await updateProject(projectId, {
    total_jobs: total,
    completed_jobs: done
  });
}

export async function deleteProject(id: string) {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

export async function duplicateProject(id: string) {
  const original = await fetchProject(id);
  const { data: u } = await supabase.auth.getUser();
  const { id: _omit, created_at, updated_at, ...rest } = original as Project & { created_at: string; updated_at: string };
  void _omit; void created_at; void updated_at;
  const { data, error } = await supabase
    .from("projects")
    .insert({ ...rest, name: `${original.name} (cópia)`, owner_id: u.user?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function archiveProject(id: string) {
  return updateProject(id, { status: "archived" });
}

export async function fetchProjectStats(projectId: string) {
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("id, done_at, due_date, stage_id")
    .eq("project_id", projectId);
  
  if (error) throw error;
  
  const { data: stages } = await supabase.from("job_stages").select("id, is_done");
  const doneStageIds = new Set(stages?.filter(s => s.is_done).map(s => s.id) || []);
  
  const total = jobs.length;
  const done = jobs.filter(j => !!j.done_at || (j.stage_id && doneStageIds.has(j.stage_id))).length;
  const pending = total - done;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = jobs.filter(j => !j.done_at && !(j.stage_id && doneStageIds.has(j.stage_id)) && j.due_date && j.due_date < today).length;
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);
  
  const { data: proj } = await supabase.from("projects").select("contract_id").eq("id", projectId).single();
  let dmeCount = 0;
  if (proj?.contract_id) {
    const { count } = await supabase
      .from("extra_demands")
      .select("id", { count: "exact", head: true })
      .eq("contract_id", proj.contract_id);
    dmeCount = count || 0;
  }


  return { total, done, pending, overdue, progress, dmeCount: dmeCount || 0 };
}


// ---------- Jobs ----------
export const JOB_STATUS_LABELS: Record<string, { label: string, color: string }> = {
  not_started: { label: 'Nova Demanda', color: '#3B82F6' },
  in_progress: { label: 'Em Execução', color: '#F59E0B' },
  waiting_client: { label: 'Aguardando Cliente', color: '#8B5CF6' },
  done: { label: 'Concluído', color: '#10B981' },
};

export async function fetchJobHistory(jobId: string) {
  const { data, error } = await supabase
    .from("job_history")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchJobAttachments(jobId: string) {
  const { data, error } = await supabase
    .from("job_attachments")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  // Gerar URLs assinadas para o ambiente interno (bucket privado)
  const dataWithUrls = await Promise.all((data || []).map(async (att) => {
    try {
      const urlParts = att.file_url.split('/job-attachments/');
      if (urlParts.length < 2) return att;
      const path = urlParts[1];
      
      const { data: signedData } = await supabase.storage
        .from('job-attachments')
        .createSignedUrl(path, 3600);
        
      return {
        ...att,
        file_url: signedData?.signedUrl || att.file_url
      };
    } catch (e) {
      console.warn("Erro ao gerar URL assinada para anexo", e);
      return att;
    }
  }));

  return dataWithUrls;
}

export async function addJobAttachment(input: {
  job_id: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  category?: string;
}) {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("job_attachments")
    .insert({ ...input, user_id: u.user?.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchJobStages(): Promise<JobStage[]> {
  const { data, error } = await supabase
    .from("job_stages")
    .select("*")
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchJobs(filters: { projectId?: string; clientId?: string; serviceId?: string; period?: string } = {}): Promise<Job[]> {
  let q = supabase
    .from("jobs")
    .select("*, clients(id, name, company), projects(id, name), services(id, name), contracts(id, title)")
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: false });
  if (filters.projectId) q = q.eq("project_id", filters.projectId);
  if (filters.clientId) q = q.eq("client_id", filters.clientId);
  if (filters.serviceId) q = q.eq("service_id", filters.serviceId);
  if (filters.period && filters.period !== "all") q = q.eq("period", filters.period);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createJob(input: Database["public"]["Tables"]["jobs"]["Insert"] & { period?: string | null, job_type?: string | null }) {
  if (!input.project_id) throw new Error("Um job deve estar vinculado a um projeto.");
  if (!input.client_id) throw new Error("Um job deve estar vinculado a um cliente.");
  if (!input.service_id) throw new Error("Um job deve estar vinculado a um serviço.");
  if (!input.contract_id) throw new Error("Um job deve estar vinculado a um contrato.");
  
  const project = await fetchProject(input.project_id);
  if (project.status === 'finished') throw new Error("Não é possível criar jobs em projetos encerrados.");
  
  const client = await fetchClient(input.client_id || project.client_id!);
  if (client.status === 'inactive') throw new Error("Não é possível criar jobs para clientes inativos.");

  // Herança automática de campos se não fornecidos
  const finalInput = {
    ...input,
    client_id: input.client_id || project.client_id || null,
    project_id: input.project_id || null,
    contract_id: input.contract_id || project.contract_id || null,
    main_responsible_id: input.main_responsible_id || project.responsible_id || project.owner_id || null,
  };

  // Limpeza de campos UUID vazios para evitar erro de sintaxe
  const cleanInput = Object.entries(finalInput).reduce((acc, [key, value]) => {
    acc[key] = (value === "" || value === undefined || value === "null" || value === "undefined") ? null : value;
    return acc;
  }, {} as any);

  // Garantir que campos obrigatórios não são nulos após limpeza
  if (!cleanInput.client_id || !cleanInput.project_id || !cleanInput.service_id || !cleanInput.contract_id) {
    throw new Error("Vínculos obrigatórios ausentes: Cliente, Projeto, Serviço e Contrato.");
  }

  console.log("createJob: Final payload after cleaning", cleanInput);

  const { data, error } = await supabase.from("jobs").insert(cleanInput).select().single();

  if (error) {
    console.error("createJob: Supabase error", error);
    throw error;
  }

  // Criar evento na agenda se houver prazo
  if (data.due_date) {
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("calendar_events").insert({
      title: `Job: ${data.title}`,
      client_id: data.client_id,
      project_id: data.project_id,
      starts_at: data.due_date,
      kind: "task",
      origin_type: "job",
      origin_id: data.id,
      source: "system",
      created_by: userData.user?.id
    } as any);
  }
  
  const { data: userData } = await supabase.auth.getUser();
  if (data.assignee_id && data.assignee_id !== userData.user?.id) {
    await supabase.rpc('notify_user', {
      p_user_id: data.assignee_id,
      p_title: "Novo Job Atribuído",
      p_description: `Você foi designado para: ${data.title}`,
      p_category: 'job',
      p_origin_type: 'jobs',
      p_origin_id: data.id,
      p_link: '/jobs'
    } as any);
  }
  
  // Checklist padrão é inicializado via trigger no banco de dados (tr_initialize_job_checklist)

  await logAudit("create", "job", data.id, null, data);
  await refreshProjectStats(data.project_id);
  return data;
}

export async function updateJob(
  id: string,
  patch: Database["public"]["Tables"]["jobs"]["Update"],
) {
  // Checklist validation on completion
  if (patch.status === 'done' || patch.done_at) {
    const checklist = await fetchChecklist(id);
    const pending = checklist.filter(it => !it.done);
    if (pending.length > 0) {
      throw new Error(`Existem ${pending.length} tarefas pendentes no checklist.`);
    }
  }

  const { data, error } = await supabase.from("jobs").update(patch).eq("id", id).select().single();
  if (error) throw error;
  
  const { data: userData } = await supabase.auth.getUser();
  if (patch.assignee_id && patch.assignee_id !== userData.user?.id) {
    await supabase.rpc('notify_user', {
      p_user_id: patch.assignee_id,
      p_title: "Responsabilidade de Job",
      p_description: `Você agora é responsável por: ${data.title}`,
      p_category: 'job',
      p_origin_type: 'jobs',
      p_origin_id: data.id,
      p_link: '/jobs'
    } as any);
  }

  if (patch.status === 'done' || patch.done_at) {
    // Notificar criador ou gestor? Para o MVP, focar nas atribuições e menções.
  }

  await logAudit("update", "job", id, null, patch);
  await refreshProjectStats(data.project_id);
  return data;
}

export async function deleteJob(id: string) {
  const { data: job } = await supabase.from("jobs").select("project_id").eq("id", id).single();
  const { error } = await supabase.from("jobs").delete().eq("id", id);
  if (error) throw error;
  if (job?.project_id) {
    await refreshProjectStats(job.project_id);
  }
}

export async function moveJob(id: string, stageId: string, extras: { done_at?: string | null } = {}) {
  return updateJob(id, { stage_id: stageId, ...extras });
}

export async function deleteJobStage(id: string) {
  // Check if stage has jobs
  const { count } = await supabase.from("jobs").select("id", { count: "exact", head: true }).eq("stage_id", id);
  if (count && count > 0) {
    throw new Error(`Não é possível excluir uma coluna que contém ${count} jobs. Mova os jobs para outra coluna primeiro.`);
  }
  const { error } = await supabase.from("job_stages").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchChecklist(jobId: string): Promise<JobChecklist[]> {
  const { data, error } = await supabase
    .from("job_checklist")
    .select("*")
    .eq("job_id", jobId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addChecklistItem(jobId: string, content: string) {
  const { data, error } = await supabase
    .from("job_checklist")
    .insert({ job_id: jobId, content })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleChecklistItem(id: string, done: boolean) {
  const { error } = await supabase.from("job_checklist").update({ done }).eq("id", id);
  if (error) throw error;
}

export async function deleteChecklistItem(id: string) {
  const { error } = await supabase.from("job_checklist").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchJobComments(jobId: string): Promise<JobComment[]> {
  const { data, error } = await supabase
    .from("job_comments")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  // Gerar URLs assinadas para anexos em comentários
  const dataWithUrls = await Promise.all((data || []).map(async (c) => {
    const metadata = (c as any).metadata;
    if (metadata?.file_url && metadata.file_url.includes('/job-attachments/')) {
      try {
        const urlParts = metadata.file_url.split('/job-attachments/');
        const path = urlParts[1];
        const { data: signedData } = await supabase.storage
          .from('job-attachments')
          .createSignedUrl(path, 3600);
        
        return {
          ...c,
          metadata: { ...metadata, file_url: signedData?.signedUrl || metadata.file_url }
        };
      } catch (e) {
        return c;
      }
    }
    return c;
  }));

  return dataWithUrls ?? [];
}

export async function addJobComment(
  jobId: string, 
  content: string, 
  type: string = 'comment', 
  metadata: any = {}, 
  isSystem: boolean = false
) {
  const { data: u } = await supabase.auth.getUser();
  const mentions = Array.from(content.matchAll(/@(\w+)/g)).map((m) => m[1]);
  const { data, error } = await supabase
    .from("job_comments")
    .insert({ 
      job_id: jobId, 
      user_id: u.user?.id ?? null, 
      content, 
      mentions,
      type,
      metadata,
      is_system: isSystem
    })
    .select()
    .single();
  if (error) throw error;

  if (mentions.length > 0) {
    const { data: job } = await supabase.from('jobs').select('title').eq('id', jobId).single();
    await handleMentions(content, {
      title: `Job: ${job?.title || 'Job'}`,
      link: `/jobs`,
      originType: 'jobs',
      originId: jobId
    });
  }

  return data;
}

export function priorityColor(p: string) {
  switch (p) {
    case "urgent":
      return "#EF4444";
    case "high":
      return "#F59E0B";
    case "low":
      return "#64748B";
    default:
      return "#FFBC45";
  }
}

export function priorityLabel(p: string) {
  return { urgent: "Urgente", high: "Alta", normal: "Normal", low: "Baixa" }[p] ?? p;
}

// ---------- Extra Demands (DME) ----------
export async function fetchExtraDemands(filters: { clientId?: string; contractId?: string } = {}) {
  let q = supabase.from("extra_demands").select("*").order("created_at", { ascending: false });
  if (filters.clientId) q = q.eq("client_id", filters.clientId);
  if (filters.contractId) q = q.eq("contract_id", filters.contractId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createExtraDemand(input: Database["public"]["Tables"]["extra_demands"]["Insert"]) {
  if (!input.client_id) throw new Error("Uma DME deve estar vinculada a um cliente.");
  
  const client = await fetchClient(input.client_id);
  if (client.status === 'inactive') throw new Error("Não é possível criar DMEs para clientes inativos.");

  if (input.is_billable && (!input.value || Number(input.value) <= 0)) {
    throw new Error("DMEs cobráveis devem ter um valor definido.");
  }

  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("extra_demands")
    .insert({ ...input, owner_id: u.user?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  
  await logAudit("create", "dme", data.id, null, data);
  return data;
}

export async function updateExtraDemand(id: string, patch: Database["public"]["Tables"]["extra_demands"]["Update"]) {
  const { data, error } = await supabase.from("extra_demands").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteExtraDemand(id: string) {
  const { error } = await supabase.from("extra_demands").delete().eq("id", id);
  if (error) throw error;
}

export async function approveExtraDemand(id: string) {
  const res = await approveExtraDemandShared(supabase, id);
  await logAudit("approve", "dme", id, null, { status: "approved" });
  return res;
}

async function logAudit(action: string, entity_type: string, entity_id: string, old_data: any, new_data: any) {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    
    await supabase.from("audit_logs").insert({
      user_id: u.user.id,
      action,
      entity_type,
      entity_id,
      old_data,
      new_data
    });
  } catch (e) {
    console.error("Audit log failed", e);
  }
}


