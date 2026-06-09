import { cn } from "@/lib/utils";

interface KasaLogoProps {
  collapsed?: boolean;
  variant?: "white" | "black" | "yellow" | "sidebar" | "login" | "loading";
  className?: string;
  iconOnly?: boolean;
}

// URLs para as logos (o usuário fará o upload quando solicitado)
const LOGO_URLS = {
  white: "/logo-white.png",
  black: "/logo-black.png",
  yellow: "/logo-yellow.png",
};

export function KasaLogo({
  collapsed = false,
  variant = "white",
  className = "",
  iconOnly = false,
}: KasaLogoProps) {
  // Mapeamento de variante de UI para variante de cor da logo
  const getLogoVariant = (): keyof typeof LOGO_URLS => {
    switch (variant) {
      case "sidebar":
      case "login":
      case "white":
        return "white";
      case "loading":
      case "yellow":
        return "yellow";
      case "black":
        return "black";
      default:
        return "white";
    }
  };

  const logoVariant = getLogoVariant();
  const logoUrl = LOGO_URLS[logoVariant];

  return (
    <div className={cn("flex items-center justify-center transition-all duration-300", className)}>
      <div
        className={cn(
          "flex items-center justify-center shrink-0",
          variant === "login" ? "h-20 w-auto" : 
          variant === "sidebar" ? (collapsed ? "size-10" : "h-14 w-auto") : 
          variant === "loading" ? "h-24 w-auto" : 
          "h-10 w-auto"
        )}
      >
        <img
          src={logoUrl}
          alt="Kasa Hub"
          className="h-full w-auto object-contain"
          onError={(e) => {
            // Fallback elegante enquanto as imagens não existem
            e.currentTarget.style.display = "none";
            const parent = e.currentTarget.parentElement;
            if (parent) {
              const fallback = document.createElement("div");
              fallback.className = cn(
                "size-8 border-2 rotate-45",
                logoVariant === "white" ? "border-white" : 
                logoVariant === "yellow" ? "border-primary" : "border-black"
              );
              parent.appendChild(fallback);
            }
          }}
        />
      </div>
      {!collapsed && !iconOnly && !["login", "sidebar", "loading"].includes(variant) && (
        <span className={cn(
          "font-display text-lg font-bold tracking-tight whitespace-nowrap ml-3",
          logoVariant === "white" ? "text-white" : "text-foreground"
        )}>
          KASA <span className="text-primary">HUB</span>
        </span>
      )}
    </div>
  );
}
