interface KasaLogoProps {
  collapsed?: boolean;
}

export function KasaLogo({ collapsed = false }: KasaLogoProps) {
  return (
    <div className="flex items-center gap-3 px-1">
      <div className="size-9 flex items-center justify-center shrink-0">
        <img 
          src="https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1045d35e-b9e6-4a0d-8042-3f74e3f3e902/id-preview-70337f7c--52e42426-6a56-4c4c-8367-2f3b97087f9e.lovable.app-1717855360000.png" 
          alt="KASA HUB Logo"
          className="size-full object-contain"
        />
      </div>
      {!collapsed && (
        <span className="font-display text-2xl font-bold tracking-tight whitespace-nowrap text-white">
          KASA <span className="text-[#FFBC45]">HUB</span>
        </span>
      )}
    </div>
  );
}