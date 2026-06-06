import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function ScopeRenderer({
  text,
  fallback,
  className = "",
}: {
  text?: string | null;
  fallback?: string[] | null;
  className?: string;
}) {
  const content =
    (text && text.trim().length > 0)
      ? text
      : (fallback && fallback.length > 0)
        ? fallback.map((i) => `- ${i}`).join("\n")
        : "";

  if (!content) return null;

  return (
    <div
      className={`prose prose-sm max-w-none prose-headings:mt-3 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
