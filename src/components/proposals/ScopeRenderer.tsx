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
    (text && text.length > 0)
      ? text
      : (fallback && fallback.length > 0)
        ? fallback.map((i) => `- ${i}`).join("\n")
        : "";

  if (!content) return null;

  return (
    <div
      className={`prose prose-sm max-w-none 
        prose-headings:mt-6 prose-headings:mb-4 
        prose-p:mb-3 prose-p:mt-0
        prose-strong:block prose-strong:mt-4 prose-strong:mb-1 first:prose-strong:mt-0
        ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{content}</ReactMarkdown>
    </div>
  );
}
