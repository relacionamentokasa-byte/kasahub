import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * Cria uma instância do provider da Lovable AI Gateway.
 * Server-only. LOVABLE_API_KEY é injetado pelo runtime.
 *
 * Arquitetura preparada para no futuro trocar/adicionar provedores
 * (Claude, OpenAI direto, Gemini) sem alterar o resto do sistema:
 * basta trocar o retorno desta função por outro provider compatível.
 */
export function createLovableAiGatewayProvider(lovableApiKey: string) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    supportsStructuredOutputs: true,
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}

export const DEFAULT_MODEL = "openai/gpt-5.5";
