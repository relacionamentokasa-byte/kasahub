import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

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
      className={`prose prose-sm max-w-none prose-headings:mt-6 prose-headings:mb-4 prose-p:my-3 prose-ul:my-3 prose-li:my-1 ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{content}</ReactMarkdown>
    </div>
  );
}
