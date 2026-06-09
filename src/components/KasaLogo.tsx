import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { fetchAgencySettings } from "@/lib/settings-api";

interface KasaLogoProps {
  collapsed?: boolean;
  variant?: "white" | "black" | "yellow" | "sidebar" | "login" | "loading";
  className?: string;
  iconOnly?: boolean;
}

export function KasaLogo({
  collapsed = false,
  variant = "white",
  className = "",
  iconOnly = false,
}: KasaLogoProps) {
  const [logoUrls, setLogoUrls] = useState({
    white: "/logo-white.png",
    black: "/logo-black.png",
    yellow: "/logo-yellow.png",
  });

  useEffect(() => {
    const loadLogos = async () => {
      try {
        const settings = await fetchAgencySettings();
        if (settings) {
          setLogoUrls({
            white: settings.logo_white_url || "/logo-white.png",
            black: settings.logo_black_url || "/logo-black.png",
            yellow: settings.logo_yellow_url || "/logo-yellow.png",
          });
        }
      } catch (error) {
        console.error("Erro ao carregar logos:", error);
      }
    };
    loadLogos();
  }, []);

  // Mapeamento de variante de UI para variante de cor da logo
  const getLogoVariant = (): "white" | "black" | "yellow" => {
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
  const logoUrl = logoUrls[logoVariant];

  return (
    <div className={cn("flex items-center justify-center transition-all duration-300", className)}>
      <div
        className={cn(
          "flex items-center justify-center shrink-0",
          variant === "login" || variant === "black" || variant === "white" ? "h-12 w-auto" : 
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
