import { getPlatform } from "./platform-icons";

export function PlatformIcon({
  id,
  size = 16,
  color = "currentColor",
  className,
}: {
  id?: string | null;
  size?: number;
  color?: string;
  className?: string;
}) {
  const p = getPlatform(id);
  if (!p) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={p.label}
      style={{ flexShrink: 0 }}
    >
      <path d={p.path} fill={color} />
    </svg>
  );
}
