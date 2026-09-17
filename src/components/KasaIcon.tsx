import { cn } from "@/lib/utils";

interface KasaIconProps {
  className?: string;
  size?: number;
  color?: string;
}

/**
 * Isotipo / Ícone oficial KASA vetorizado (o símbolo da marca).
 * Renderiza perfeitamente em branco, dourado ou qualquer cor.
 */
export function KasaIcon({ className, size = 28, color = "currentColor" }: KasaIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 transition-transform", className)}
    >
      {/* Símbolo KASA geométrico */}
      <path
        d="M20 16H34V84H20V16Z"
        fill={color}
      />
      <path
        d="M34 50L68 16H86L50 52L88 84H70L34 52V50Z"
        fill={color}
      />
    </svg>
  );
}
