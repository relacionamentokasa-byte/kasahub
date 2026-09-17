import { CheckCircle2, FileSignature, Clock, Mail, Globe, Calendar, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

async function openExternalSignature(url: string) {
  try {
    const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/signatures\/(.+?)(?:\?|$)/);
    const path = match ? decodeURIComponent(match[1]) : null;
    if (!path) {
      window.open(url, "_blank");
      return;
    }
    const { data, error } = await supabase.storage
      .from("signatures")
      .createSignedUrl(path, 60 * 10);
    if (error || !data?.signedUrl) throw error;
    window.open(data.signedUrl, "_blank");
  } catch (e: any) {
    toast.error("Não foi possível abrir o comprovante: " + (e?.message || "erro"));
  }
}

interface ProposalSignatureCardProps {
  status?: string | null;
  signatureClient?: string | null;
  clientSignatureData?: string | null;
  acceptedName?: string | null;
  acceptedAt?: string | null;
  signedAtClient?: string | null;
  acceptedIp?: string | null;
  clientSignedEmail?: string | null;
  clientEmail?: string | null;
  clientName?: string | null;
  externalSignatureUrl?: string | null;
  externalSignatureFilename?: string | null;
}

function formatDateTime(date?: string | null) {
  if (!date) return null;
  try {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

export function ProposalSignatureCard({
  status,
  signatureClient,
  clientSignatureData,
  acceptedName,
  acceptedAt,
  signedAtClient,
  acceptedIp,
  clientSignedEmail,
  clientEmail,
  clientName,
  externalSignatureUrl,
  externalSignatureFilename,
}: ProposalSignatureCardProps) {
  const hasSignature = Boolean(
    signatureClient || clientSignatureData || acceptedAt || signedAtClient || externalSignatureUrl
  );

  if (!hasSignature) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <Clock className="size-4 shrink-0 text-muted-foreground" />
        <div>
          <span className="font-medium text-foreground">Aguardando assinatura do cliente.</span>{" "}
          <span>Envie o link público para assinatura digital segura.</span>
        </div>
      </div>
    );
  }

  const signedName = acceptedName || clientName || "Cliente";
  const signedDate = formatDateTime(acceptedAt || signedAtClient);
  const signedEmail = clientSignedEmail || clientEmail;
  const signatureImage =
    clientSignatureData && clientSignatureData.startsWith("data:image")
      ? clientSignatureData
      : null;

  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
          <span className="text-[11px] font-mono-kasa uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
            Aceite Digital Confirmado
          </span>
        </div>
        <span className="text-[10px] font-mono-kasa text-muted-foreground">
          MP 2.200-2/2001
        </span>
      </div>

      <div className="rounded-md border border-border/60 bg-card p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-mono-kasa text-muted-foreground block">
            Assinado por
          </span>
          {signatureImage ? (
            <div className="flex flex-col gap-1">
              <img
                src={signatureImage}
                alt={`Assinatura de ${signedName}`}
                className="max-h-12 object-contain self-start invert dark:invert-0"
              />
              <span className="font-mono-kasa text-sm font-semibold text-foreground">
                {signedName}
              </span>
            </div>
          ) : (
            <div className="font-serif italic text-base text-foreground font-semibold">
              {signedName}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
          {signedDate && (
            <div className="flex items-center gap-1.5 text-muted-foreground font-mono-kasa text-[11px]">
              <Calendar className="size-3 text-muted-foreground/70" />
              <span>{signedDate}</span>
            </div>
          )}
          {signedEmail && (
            <div className="flex items-center gap-1.5 text-muted-foreground font-mono-kasa text-[11px] truncate max-w-[200px]">
              <Mail className="size-3 text-muted-foreground/70" />
              <span className="truncate">{signedEmail}</span>
            </div>
          )}
          {acceptedIp && (
            <div className="flex items-center gap-1.5 text-muted-foreground font-mono-kasa text-[11px] sm:col-span-2">
              <Globe className="size-3 text-muted-foreground/70" />
              <span>IP: {acceptedIp}</span>
            </div>
          )}
        </div>
      </div>

      {externalSignatureUrl && (
        <button
          type="button"
          onClick={() => openExternalSignature(externalSignatureUrl)}
          className="w-full flex items-center gap-2 rounded-md border border-border/60 bg-card px-3 py-2 text-xs text-foreground hover:bg-muted/50 transition-colors text-left"
        >
          <Paperclip className="size-3.5 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase font-mono-kasa text-muted-foreground block">
              Comprovante Externo
            </span>
            <span className="font-medium truncate block text-xs">
              {externalSignatureFilename || "Ver comprovante anexado"}
            </span>
          </div>
          <span className="text-xs font-mono-kasa text-primary hover:underline">Abrir</span>
        </button>
      )}
    </div>
  );
}
