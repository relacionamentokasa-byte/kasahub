export function ScopeRenderer({
  text,
  className = "",
}: {
  text?: string | string[] | null;
  className?: string;
}) {
  if (!text) return null;

  let content = "";
  if (Array.isArray(text)) {
    content = text.join("\n");
  } else {
    content = text;
  }

  // Se o conteúdo parecer um JSON de array, tenta converter para texto com quebras de linha
  if (content.startsWith('[') && content.endsWith(']')) {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        content = parsed.join("\n");
      }
    } catch (e) {
      // Not a JSON array, use as is
    }
  }

  return (
    <div className={`whitespace-pre-wrap text-[#0c1618] font-medium leading-relaxed ${className}`}>
      {content}
    </div>
  );
}
