import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ConnectionIndicator() {
  const qc = useQueryClient();
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      toast.success("Conexão restabelecida — sincronizando…");
      qc.invalidateQueries();
    };
    const goOffline = () => {
      setOnline(false);
      toast.warning("Você está offline. Os dados em cache continuam disponíveis.");
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [qc]);

  return (
    <span
      title={online ? "Online" : "Offline"}
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full border",
        online
          ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
          : "text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/10",
      )}
    >
      {online ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
      <span className="hidden md:inline">{online ? "Online" : "Offline"}</span>
    </span>
  );
}
