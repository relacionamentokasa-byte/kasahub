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
    \\u003cdiv\\n      className={`prose prose-sm max-w-none \\n        prose-headings:mt-6 prose-headings:mb-4 \\n        prose-p:mb-[12px] prose-p:mt-0\\n        prose-strong:block prose-strong:mt-[16px] prose-strong:mb-[4px] first:prose-strong:mt-0\\n        ${className}`}\\n    \\u003e\\n      \\u003cReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}\\u003e{content}\\u003c/ReactMarkdown\\u003e\\n    \\u003c/div\\u003e
  );
}
