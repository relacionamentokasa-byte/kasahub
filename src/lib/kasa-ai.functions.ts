import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const InputSchema = z.object({
  messages: z.array(MessageSchema).min(1),
  clientId: z.string().uuid().nullable().optional(),
  knowledgeIds: z.array(z.string().uuid()).optional(),
  model: z.string().optional(),
  threadId: z.string().uuid().nullable().optional(),
  userText: z.string().min(1),
});

type ContextSource = {
  kind: "client" | "knowledge" | "recent";
  id?: string;
  label: string;
  snippet?: string;
};

async function buildContext(
  supabase: any,
  input: z.infer<typeof InputSchema>,
): Promise<{ text: string; sources: ContextSource[] }> {
  const sources: ContextSource[] = [];
  const parts: string[] = [];

  // 1. Cliente explícito
  if (input.clientId) {
    const { data: c } = await supabase
      .from("clients")
      .select(
        "id, name, company, segment, tone_of_voice, target_audience, brand_values, brand_notes, commercial_contact_name, notes",
      )
      .eq("id", input.clientId)
      .maybeSingle();
    if (c) {
      const label = c.company || c.name;
      const snippet = [
        `Segmento: ${c.segment ?? "-"}`,
        c.tone_of_voice ? `Tom de voz: ${c.tone_of_voice}` : null,
        c.target_audience ? `Público: ${c.target_audience}` : null,
        c.brand_values ? `Valores: ${c.brand_values}` : null,
        c.brand_notes ? `Notas: ${c.brand_notes}` : null,
        c.notes ? `Obs: ${c.notes}` : null,
      ]
        .filter(Boolean)
        .join(" | ");
      sources.push({ kind: "client", id: c.id, label, snippet });
      parts.push(`### Cliente selecionado: ${label}\n${snippet}`);

      // Serviços contratados
      const { data: services } = await supabase
        .from("client_services")
        .select("service_name, description")
        .eq("client_id", c.id)
        .limit(20);
      if (services && services.length) {
        parts.push(
          `Serviços contratados:\n${services.map((s: any) => `- ${s.service_name}${s.description ? ` — ${s.description}` : ""}`).join("\n")}`,
        );
      }

      // Projetos ativos
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name, status")
        .eq("client_id", c.id)
        .in("status", ["active", "in_progress", "planning"])
        .limit(10);
      if (projects && projects.length) {
        parts.push(
          `Projetos ativos:\n${projects.map((p: any) => `- ${p.name} (${p.status})`).join("\n")}`,
        );
      }

      // Últimos calendários editoriais
      const { data: posts } = await supabase
        .from("editorial_posts")
        .select("title, publish_date, network, format")
        .eq("client_id", c.id)
        .order("publish_date", { ascending: false })
        .limit(8);
      if (posts && posts.length) {
        parts.push(
          `Últimos posts do calendário:\n${posts.map((p: any) => `- [${p.publish_date}] ${p.network}/${p.format}: ${p.title}`).join("\n")}`,
        );
      }
    }
  }

  // 2. Documentos da Biblioteca marcados
  if (input.knowledgeIds && input.knowledgeIds.length) {
    const { data: docs } = await supabase
      .from("kb_documents")
      .select("id, title, category, segment, description, content")
      .in("id", input.knowledgeIds)
      .limit(10);
    if (docs) {
      for (const d of docs as any[]) {
        const snippet = d.description || (d.content ? String(d.content).slice(0, 300) : "");
        sources.push({
          kind: "knowledge",
          id: d.id,
          label: `${d.title} (${d.category})`,
          snippet,
        });
        parts.push(
          `### Biblioteca — ${d.title} [${d.category}${d.segment ? `/${d.segment}` : ""}]\n${d.description ?? ""}\n${d.content ? `\nConteúdo:\n${String(d.content).slice(0, 2000)}` : ""}`,
        );
      }
    }
  }

  return { text: parts.join("\n\n---\n\n"), sources };
}

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => InputSchema.parse(v))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

    const { supabase } = context;
    const ctx = await buildContext(supabase, data);
    const modelId = data.model || "openai/gpt-5.5";

    const systemPrompt = `Você é o **Kasa AI**, o assistente operacional oficial da agência de marketing Kasa, dentro do sistema Kasa Hub.

Sua missão é ajudar a equipe da agência com estratégia, planejamento de conteúdo, calendários editoriais, roteiros, briefings, campanhas, copywriting, tráfego pago e procedimentos internos.

Diretrizes:
- Responda sempre em **português brasileiro**, tom profissional e criativo, direto e prático.
- Use **Markdown** (títulos, listas, negrito) para deixar respostas escaneáveis.
- Se o usuário selecionou um cliente ou documentos da Biblioteca, **use esse contexto como fonte primária** e cite quando for relevante.
- Se faltar informação para fazer um bom trabalho, **pergunte antes** de inventar.
- Quando gerar entregas (calendário, roteiro, briefing, copy), entregue já em formato pronto para copiar/colar ou salvar como conhecimento.

${ctx.text ? `## Contexto disponível\n${ctx.text}` : "Sem contexto de cliente ou biblioteca selecionado nesta conversa."}`;

    const body = {
      model: modelId,
      messages: [
        { role: "system", content: systemPrompt },
        ...data.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "kasa-hub",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 429) {
        throw new Error("Limite de requisições atingido. Tente novamente em alguns instantes.");
      }
      if (res.status === 402) {
        throw new Error(
          "Créditos de IA esgotados. Adicione créditos nas configurações do workspace Lovable.",
        );
      }
      throw new Error(`Falha no Kasa AI (${res.status}): ${text.slice(0, 300)}`);
    }

    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "";

    return {
      content,
      model: modelId,
      sources: ctx.sources,
    };
  });
