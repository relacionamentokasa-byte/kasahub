import { cn } from "@/lib/utils";

interface KasaSymbolProps {
  className?: string;
  size?: number;
  color?: string;
}

/**
 * Vetorização geométrica exata do ícone oficial KASA enviado.
 * Haste vertical sólida + braços diagonais com os ângulos e chanfros exatos da marca.
 */
export function KasaSymbol({ className, size = 26, color = "#FFFFFF" }: KasaSymbolProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 select-none", className)}
    >
      {/* Haste vertical esquerda */}
      <polygon points="19,16 41,16 41,84 19,84" fill={color} />
      {/* Braço diagonal superior */}
      <polygon points="41,47 70,16 93,16 54,58" fill={color} />
      {/* Braço diagonal inferior */}
      <polygon points="43,45 61,64 93,84 66,84" fill={color} />
    </svg>
  );
}
