interface KasaLogoProps {
  collapsed?: boolean;
}

export function KasaLogo({ collapsed = false }: KasaLogoProps) {
  return (
    <div className="flex items-center gap-3 px-1">
      <div className="size-8 bg-primary rounded-md flex items-center justify-center shrink-0 shadow-[0_0_20px_-4px] shadow-primary/40">
        <div className="size-3.5 border-2 border-primary-foreground rotate-45" />
      </div>
      {!collapsed && (
        <span className="font-display text-lg font-bold tracking-tight whitespace-nowrap">
          KASA <span className="text-primary">OS</span>
        </span>
      )}
    </div>
  );
}