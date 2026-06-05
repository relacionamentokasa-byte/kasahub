import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ImageUpload({
  value,
  onChange,
  folder = "uploads",
  label = "Imagem",
}: {
  value?: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Máximo 5MB");
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("public-assets")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data, error: signErr } = await supabase.storage
        .from("public-assets")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signErr) throw signErr;
      onChange(data.signedUrl);
      toast.success("Imagem carregada");
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao enviar imagem");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {value ? (
        <img
          src={value}
          alt={label}
          className="size-16 rounded-md object-cover border border-border"
        />
      ) : (
        <div className="size-16 rounded-md border border-dashed border-border grid place-items-center text-muted-foreground text-xs">
          {label}
        </div>
      )}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          <span className="ml-2">{value ? "Trocar" : "Enviar"}</span>
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
            disabled={busy}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
