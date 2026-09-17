import { cn } from "@/lib/utils";

interface KasaLogoWhiteProps {
  className?: string;
  height?: number;
}

export function KasaLogoWhite({ className, height = 24 }: KasaLogoWhiteProps) {
  return (
    <svg
      height={height}
      viewBox="0 0 160 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-auto shrink-0 select-none", className)}
    >
      <text
        x="0"
        y="30"
        fill="#FFFFFF"
        fontFamily="Funnel Display, system-ui, -apple-system, sans-serif"
        fontSize="32"
        fontWeight="800"
        letterSpacing="0.08em"
      >
        KASA
      </text>
      <text
        x="105"
        y="30"
        fill="#FFBC45"
        fontFamily="Funnel Display, system-ui, -apple-system, sans-serif"
        fontSize="32"
        fontWeight="800"
        letterSpacing="0.08em"
      >
        HUB
      </text>
    </svg>
  );
}
