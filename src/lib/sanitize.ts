import DOMPurify from "dompurify";

/**
 * Sanitiza HTML de forma segura contra ataques XSS.
 * Executa DOMPurify no browser (client-side).
 * No ambiente de servidor (SSR), retorna a string diretamente sem quebrar dependências de DOM.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  if (typeof window !== "undefined" && DOMPurify && typeof DOMPurify.sanitize === "function") {
    return DOMPurify.sanitize(html);
  }
  return html;
}
