import type { SocialNetwork } from "@/lib/editorial-api";
import { cn } from "@/lib/utils";
import { Globe } from "lucide-react";

// Brand-colored, official-style social icons rendered as inline SVG.
// Sizes: 12 / 14 / 16 / 20 / 24 px via the `size` prop (defaults to 16).
export function SocialIcon({
  network,
  size = 16,
  className,
}: {
  network: SocialNetwork;
  size?: number;
  className?: string;
}) {
  const s = { width: size, height: size };
  switch (network) {
    case "instagram":
      return (
        <svg viewBox="0 0 32 32" {...s} className={className} aria-label="Instagram">
          <defs>
            <radialGradient id={`ig-${size}`} cx="30%" cy="107%" r="150%">
              <stop offset="0%" stopColor="#FFD776" />
              <stop offset="25%" stopColor="#F58529" />
              <stop offset="50%" stopColor="#DD2A7B" />
              <stop offset="75%" stopColor="#8134AF" />
              <stop offset="100%" stopColor="#515BD4" />
            </radialGradient>
          </defs>
          <rect x="2" y="2" width="28" height="28" rx="7" fill={`url(#ig-${size})`} />
          <rect x="8" y="8" width="16" height="16" rx="5" fill="none" stroke="#fff" strokeWidth="2" />
          <circle cx="16" cy="16" r="4" fill="none" stroke="#fff" strokeWidth="2" />
          <circle cx="22" cy="10" r="1.4" fill="#fff" />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 32 32" {...s} className={className} aria-label="YouTube">
          <rect x="1" y="6" width="30" height="20" rx="5" fill="#FF0000" />
          <path d="M13 11.5v9l8-4.5z" fill="#fff" />
        </svg>
      );
    case "tiktok":
      return (
        <svg viewBox="0 0 32 32" {...s} className={className} aria-label="TikTok">
          <rect x="2" y="2" width="28" height="28" rx="6" fill="#000" />
          <path
            d="M21 9.5c0 2 1.6 3.6 3.6 3.6v3a6.6 6.6 0 0 1-3.6-1v6.4a5.5 5.5 0 1 1-5.5-5.5c.2 0 .4 0 .6.05V19a2.5 2.5 0 1 0 1.9 2.4V8h3z"
            fill="#25F4EE"
            transform="translate(-1 0)"
          />
          <path
            d="M21 9.5c0 2 1.6 3.6 3.6 3.6v3a6.6 6.6 0 0 1-3.6-1v6.4a5.5 5.5 0 1 1-5.5-5.5c.2 0 .4 0 .6.05V19a2.5 2.5 0 1 0 1.9 2.4V8h3z"
            fill="#FE2C55"
            transform="translate(1 0)"
          />
          <path
            d="M21 9.5c0 2 1.6 3.6 3.6 3.6v3a6.6 6.6 0 0 1-3.6-1v6.4a5.5 5.5 0 1 1-5.5-5.5c.2 0 .4 0 .6.05V19a2.5 2.5 0 1 0 1.9 2.4V8h3z"
            fill="#fff"
          />
        </svg>
      );
    case "linkedin":
      return (
        <svg viewBox="0 0 32 32" {...s} className={className} aria-label="LinkedIn">
          <rect x="2" y="2" width="28" height="28" rx="4" fill="#0A66C2" />
          <rect x="7" y="13" width="3.5" height="11" fill="#fff" />
          <circle cx="8.75" cy="9.5" r="1.9" fill="#fff" />
          <path d="M13.5 13h3.3v1.6c.6-1 1.8-1.9 3.6-1.9 3 0 3.9 1.9 3.9 4.4V24h-3.5v-5.8c0-1.4-.5-2.3-1.8-2.3-1.4 0-2 .9-2 2.3V24h-3.5z" fill="#fff" />
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 32 32" {...s} className={className} aria-label="Facebook">
          <rect x="2" y="2" width="28" height="28" rx="6" fill="#1877F2" />
          <path d="M19 16h2.6l.4-3.2H19v-2c0-.9.3-1.6 1.7-1.6H22V6.2c-.3 0-1.3-.2-2.5-.2-2.5 0-4.2 1.5-4.2 4.3v2.5h-2.8V16h2.8v8H19z" fill="#fff" />
        </svg>
      );
    default:
      return <Globe className={cn("text-foreground/60", className)} style={s} aria-label="Outra rede" />;
  }
}
