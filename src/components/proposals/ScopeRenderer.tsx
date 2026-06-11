import { cn } from "@/lib/utils";

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
    // If it's the old array format, render as list items
    return (
      <div className={cn("space-y-2", className)}>
        <ul className="list-disc list-outside ml-5 space-y-3">
          {text.map((item, idx) => (
            <li key={idx} className="text-[#0c1618] font-medium leading-relaxed pl-1">
              {item}
            </li>
          ))}
        </ul>
      </div>
    );
  } else {
    content = text;
  }

  // Se o conteúdo parecer um JSON de array, tenta converter para texto com quebras de linha
  if (content.startsWith('[') && content.endsWith(']')) {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return (
          <div className={cn("space-y-2", className)}>
            <ul className="list-disc list-outside ml-5 space-y-3">
              {parsed.map((item, idx) => (
                <li key={idx} className="text-[#0c1618] font-medium leading-relaxed pl-1">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        );
      }
    } catch (e) {
      // Not a JSON array, use as is
    }
  }

  // If it's HTML (contains tags), use dangerouslySetInnerHTML with prose classes
  const isHtml = content.includes('<') && content.includes('>');

  if (isHtml) {
    return (
      <div 
        className={cn(
          "prose prose-sm max-w-none text-[#0c1618] prose-headings:text-[#0c1618] prose-p:leading-relaxed prose-li:leading-relaxed", 
          className
        )}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  // Fallback for plain text
  return (
    <div className={cn("whitespace-pre-wrap text-[#0c1618] font-medium leading-relaxed", className)}>
      {content}
    </div>
  );
}
