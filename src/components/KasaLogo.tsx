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
  // URLs fixas no Supabase Storage
  const FIXED_LOGOS = {
    white: "https://fduofhsiahyxvlaxthhe.supabase.co/storage/v1/object/public/logos/logo-white.png?v=3",
    yellow: "https://fduofhsiahyxvlaxthhe.supabase.co/storage/v1/object/public/logos/logo-yellow.png",
  };

  // Mapeamento de variante de UI para URL da logo
  const getLogoUrl = () => {
    switch (variant) {
      case "sidebar":
      case "login":
      case "white":
        return FIXED_LOGOS.white;
      case "loading":
      case "yellow":
        return FIXED_LOGOS.yellow;
      case "black":
        // Fallback para preta se necessário, mas usuário pediu branca/amarela fixas
        return FIXED_LOGOS.white;
      default:
        return FIXED_LOGOS.white;
    }
  };

  const logoUrl = getLogoUrl();
  const isYellow = variant === "loading" || variant === "yellow";

  return (
    <div className={cn("flex items-center justify-center transition-all duration-300", className)}>
      <div
        className={cn(
          "flex items-center justify-center shrink-0",
          variant === "login" || variant === "black" || variant === "white" ? "h-12 w-auto" : 
          variant === "sidebar" ? (collapsed ? "h-6 w-auto" : "h-12 w-auto") : 
          variant === "loading" ? "h-24 w-auto" : 
          "h-10 w-auto"
        )}
      >
        <img
          src={logoUrl}
          alt="Kasa Hub"
          className="h-full w-auto object-contain"
          onError={(e) => {
            // Fallback elegante
            e.currentTarget.style.display = "none";
            const parent = e.currentTarget.parentElement;
            if (parent) {
              const fallback = document.createElement("div");
              fallback.className = cn(
                "size-8 border-2 rotate-45",
                isYellow ? "border-primary" : "border-white"
              );
              parent.appendChild(fallback);
            }
          }}
        />
      </div>
      {!collapsed && !iconOnly && !["login", "sidebar", "loading"].includes(variant) && (
        <span className={cn(
          "font-display text-lg font-bold tracking-tight whitespace-nowrap ml-3",
          isYellow ? "text-foreground" : "text-white"
        )}>
          KASA <span className="text-primary">HUB</span>
        </span>
      )}
    </div>
  );
}
