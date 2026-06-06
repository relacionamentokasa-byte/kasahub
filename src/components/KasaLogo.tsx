import { useQuery } from "@tanstack/react-query";
import { fetchAgencySettings } from "@/lib/settings-api";

interface KasaLogoProps {
  collapsed?: boolean;
}

export function KasaLogo({ collapsed = false }: KasaLogoProps) {
  const { data: settings } = useQuery({
    queryKey: ["agency-settings"],
    queryFn: fetchAgencySettings,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const logoUrl = settings?.logo_url;

  return (
    <div className="flex items-center gap-3 px-1">
      <div className="size-8 bg-white rounded-md flex items-center justify-center shrink-0 shadow-[0_0_20px_-4px] shadow-primary/20 overflow-hidden border border-border p-1">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="size-full object-cover" />
        ) : (
          <div className="size-3.5 border-2 border-primary-foreground rotate-45" />
        )}
      </div>
      {!collapsed && (
        <span className="font-display text-lg font-bold tracking-tight whitespace-nowrap">
          {settings?.name ? (
            <>
              {settings.name.split(" ").slice(0, -1).join(" ")} <span className="text-primary">{settings.name.split(" ").slice(-1)}</span>
            </>
          ) : (
            <>KASA <span className="text-primary">HUB</span></>
          )}
        </span>
      )}
    </div>
  );
}