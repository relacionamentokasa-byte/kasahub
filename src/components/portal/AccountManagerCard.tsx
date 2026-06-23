import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Phone } from "lucide-react";
import { StorageImage } from "@/components/ui/storage-image";

/**
 * Card "Quem cuida de você" no topo do portal do cliente.
 * Mostra o dono da conta (clients.owner_id) com avatar, nome e atalhos
 * de WhatsApp / email para humanizar o relacionamento.
 */
export function AccountManagerCard({ clientId }: { clientId: string }) {
  const { data } = useQuery({
    queryKey: ["portal-account-manager", clientId],
    queryFn: async () => {
      const { data: client } = await supabase
        .from("clients")
        .select("owner_id, commercial_contact_name")
        .eq("id", clientId)
        .maybeSingle();
      if (!client?.owner_id) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, full_name, avatar_url, phone")
        .eq("id", client.owner_id)
        .maybeSingle();
      return profile;
    },
  });

  if (!data) return null;

  const name = data.display_name || data.full_name || "Sua conta";
  const initials = name.split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase();
  const rawPhone = (data as any).phone as string | null | undefined;
  const phone = rawPhone?.replace(/\D/g, "") ?? "";
  const wa = phone ? `https://wa.me/${phone.startsWith("55") ? phone : `55${phone}`}` : null;

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-r from-primary/5 via-surface to-surface p-4 sm:p-5 flex items-center gap-4">
      <div className="size-14 sm:size-16 rounded-full bg-primary/15 ring-2 ring-primary/30 overflow-hidden flex items-center justify-center shrink-0">
        {data.avatar_url ? (
          <StorageImage src={data.avatar_url} alt={name} className="size-full object-cover" />
        ) : (
          <span className="text-sm font-bold text-primary">{initials}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-widest font-bold text-foreground/40">Sua conta</div>
        <div className="font-display text-lg sm:text-xl font-bold truncate">{name}</div>
        <div className="text-xs text-foreground/50 truncate">Aqui para o que você precisar.</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            title="Chamar no WhatsApp"
            className="size-10 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition shadow-sm"
          >
            <MessageCircle className="size-4" />
          </a>
        )}
        {rawPhone && !wa && (
          <a
            href={`tel:${rawPhone}`}
            title="Ligar"
            className="size-10 rounded-full bg-surface-elevated border border-border flex items-center justify-center hover:border-primary transition"
          >
            <Phone className="size-4" />
          </a>
        )}
      </div>
    </div>
  );
}
