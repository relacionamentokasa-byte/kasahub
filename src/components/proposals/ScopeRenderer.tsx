export function ScopeRenderer({
  text,
  fallback,
  className = "",
}: {
  text?: string | string[] | null;
  fallback?: string[] | null;
  className?: string;
}) {
  let items: string[] = [];
  if (Array.isArray(text)) {
    items = text;
  } else if (typeof text === 'string' && text.length > 0) {
    if (text.startsWith('[')) {
      try {
        const parsed = JSON.parse(text);
        items = Array.isArray(parsed) ? parsed : [text];
      } catch (e) {
        items = [text];
      }
    } else {
      items = text.split('\n').map(line => line.replace(/^[-\s*]+/, '').trim()).filter(Boolean);
    }
  } else {
    items = fallback || [];
  }

  if (items.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      <ul className="list-disc list-outside ml-5 space-y-3">
        {items.map((item, idx) => (
          <li key={idx} className="text-[#0c1618] font-medium leading-relaxed pl-1">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
