export function ScopeRenderer({
  text,
  fallback,
  className = "",
}: {
  text?: string | string[] | null;
  fallback?: string[] | null;
  className?: string;
}) {
  const items = Array.isArray(text) 
    ? text 
    : (typeof text === 'string' && text.length > 0)
      ? text.split('\n').map(line => line.replace(/^[-\s*]+/, '').trim()).filter(Boolean)
      : fallback || [];

  if (items.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      <ul className="list-disc list-inside space-y-2">
        {items.map((item, idx) => (
          <li key={idx} className="text-foreground/80 leading-relaxed">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
