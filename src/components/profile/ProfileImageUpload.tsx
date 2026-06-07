import { useRef, useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, Check, Move } from "lucide-react";
import { toast } from "sonner";
import { getCroppedImg } from "@/lib/crop-image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

export function ProfileImageUpload({
  value,
  onChange,
  label = "Foto de perfil",
  shape = "round",
  aspect,
}: {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  shape?: "round" | "rect";
  aspect?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropper, setShowCropper] = useState(false);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImage(reader.result as string);
      setShowCropper(true);
    });
    reader.readAsDataURL(file);
  }

  const handleSaveCrop = async () => {
    if (!image || !croppedAreaPixels) return;
    setBusy(true);
    try {
      const croppedBlob = await getCroppedImg(image, croppedAreaPixels);
      const file = new File([croppedBlob], "avatar.webp", { type: "image/webp" });
      
      const path = `avatars/${crypto.randomUUID()}.webp`;
      const { error: upErr } = await supabase.storage
        .from("public-assets")
        .upload(path, file, { upsert: false, contentType: "image/webp" });
      
      if (upErr) throw upErr;

      const { data, error: signErr } = await supabase.storage
        .from("public-assets")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      
      if (signErr) throw signErr;
      
      onChange(data.signedUrl);
      setShowCropper(false);
      setImage(null);
      toast.success("Foto atualizada");
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao salvar imagem");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-4">
        <div className="relative group">
          <div className={`size-32 border-2 border-primary/20 overflow-hidden ${shape === "round" ? "rounded-full bg-muted" : "rounded-xl bg-white/5"} relative`}>
            {/* Background checkered pattern for transparency visibility */}
            {shape === "rect" && (
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'conic-gradient(#000 0.25turn, #fff 0.25turn 0.5turn, #000 0.5turn 0.75turn, #fff 0.75turn)', backgroundSize: '10px 10px' }} />
            )}
            {value ? (
              <img
                src={value}
                alt="Preview"
                className={`w-full h-full relative z-10 ${shape === "round" ? "object-cover" : "object-contain p-2"}`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <Upload className="size-8" />
              </div>
            )}
          </div>
          <button
            onClick={() => inputRef.current?.click()}
            className={`absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${shape === "round" ? "rounded-full" : "rounded-xl"}`}
          >
            <Move className="size-5 mb-1" />
            <span className="text-[10px] font-medium">Ajustar</span>
          </button>
        </div>

        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-[11px]"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {busy ? <Loader2 className="size-3 animate-spin mr-2" /> : <Upload className="size-3 mr-2" />}
            {value ? "Mudar foto" : "Subir foto"}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onChange(null)}
              disabled={busy}
            >
              <X className="size-3" />
            </Button>
          )}
        </div>
      </div>

      <Dialog open={showCropper} onOpenChange={setShowCropper}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-surface border-border">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl font-display font-bold">Ajustar Foto</DialogTitle>
          </DialogHeader>
          
          <div className="relative h-[350px] w-full bg-[#111] mt-4 overflow-hidden">
            {/* Transparency grid for cropper */}
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'conic-gradient(#fff 0.25turn, #000 0.25turn 0.5turn, #fff 0.5turn 0.75turn, #000 0.75turn)', backgroundSize: '20px 20px' }} />

            {image && (
              <Cropper
                image={image}
                crop={crop}
                zoom={zoom}
                aspect={aspect || (shape === "round" ? 1 : 16 / 9)}
                cropShape={shape === "round" ? "round" : "rect"}
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            )}
          </div>

          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono-kasa text-foreground/60 uppercase tracking-wider">
                <span>Zoom</span>
                <span>{(zoom * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.1}
                onValueChange={(vals) => setZoom(vals[0])}
              />
            </div>
          </div>

          <DialogFooter className="p-6 pt-0 gap-2 flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowCropper(false)}
              disabled={busy}
              className="flex-1 sm:flex-none"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveCrop}
              disabled={busy}
              className="flex-1 sm:flex-none gap-2"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Salvar Ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
