import { CheckCircle2, FileSignature, Clock, Mail, Globe, Calendar, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

async function openExternalSignature(url: string) {
  try {
    // Extract path after the bucket name
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
      <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm">
        <Clock className="size-5 shrink-0" />
        <div className="text-sm">
          <span className="font-semibold">Aguardando assinatura do cliente.</span>{" "}
          <span className="text-amber-800/80">
            Envie o link público para que o cliente assine digitalmente.
          </span>
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
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 p-6 shadow-sm",
        "before:absolute before:right-0 before:top-0 before:h-32 before:w-32 before:-translate-y-12 before:translate-x-12 before:rounded-full before:bg-emerald-100/40"
      )}
    >
      <div className="relative space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-4 ring-emerald-50">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-700/70">
                Certificado de Aceite
              </div>
              <div className="text-base font-bold text-emerald-900">
                Proposta Assinada Digitalmente
              </div>
            </div>
          </div>
          <FileSignature className="size-8 text-emerald-300" />
        </div>

        {/* Signature display */}
        <div className="rounded-xl border border-dashed border-emerald-300 bg-white/70 px-6 py-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-700/60 mb-2">
            Assinado por
          </div>
          {signatureImage ? (
            <div className="flex flex-col gap-2">
              <img
                src={signatureImage}
                alt={`Assinatura de ${signedName}`}
                className="max-h-24 object-contain self-start"
              />
              <div className="font-serif italic text-xl text-slate-800">
                {signedName}
              </div>
            </div>
          ) : (
            <div className="font-serif italic text-3xl text-slate-800 leading-tight">
              {signedName}
            </div>
          )}
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {signedDate && (
            <div className="flex items-center gap-2 text-emerald-900">
              <Calendar className="size-4 text-emerald-600" />
              <span className="text-emerald-700/70 text-xs">Data:</span>
              <span className="font-semibold">{signedDate}</span>
            </div>
          )}
          {signedEmail && (
            <div className="flex items-center gap-2 text-emerald-900">
              <Mail className="size-4 text-emerald-600" />
              <span className="text-emerald-700/70 text-xs">E-mail:</span>
              <span className="font-medium truncate">{signedEmail}</span>
            </div>
          )}
          {acceptedIp && (
            <div className="flex items-center gap-2 text-emerald-900 sm:col-span-2">
              <Globe className="size-4 text-emerald-600" />
              <span className="text-emerald-700/70 text-xs">IP de origem:</span>
              <span className="font-mono text-xs text-emerald-800">{acceptedIp}</span>
            </div>
          )}
        </div>

        {externalSignatureUrl && (
          <button
            type="button"
            onClick={() => openExternalSignature(externalSignatureUrl)}
            className="w-full flex items-center gap-3 rounded-xl border border-emerald-300 bg-white/80 px-4 py-3 text-sm text-emerald-900 hover:bg-white transition-colors text-left"
          >
            <Paperclip className="size-4 text-emerald-600" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-700/70">
                Comprovante (assinada externamente)
              </div>
              <div className="font-medium truncate">
                {externalSignatureFilename || "Ver comprovante"}
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-700 underline">Abrir</span>
          </button>
        )}

        <div className="text-[10px] text-emerald-700/60 border-t border-emerald-100 pt-3">
          Este aceite digital tem validade jurídica conforme MP 2.200-2/2001. Alterar o
          conteúdo da proposta após o aceite invalidará a assinatura registrada.
        </div>
      </div>
    </div>
  );
}
