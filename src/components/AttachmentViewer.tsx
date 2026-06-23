import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, X } from "lucide-react";
import { FileThumbnail, getFileKind } from "@/components/FileThumbnail";
import { PdfDocumentViewer } from "@/components/PdfDocumentViewer";

interface AttachmentViewerProps {
  url: string | null;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AttachmentViewer({ url, fileName, isOpen, onClose }: AttachmentViewerProps) {
  if (!url) return null;

  const kind = getFileKind(fileName);
  const isImage = kind === "image";
  const isPDF = kind === "pdf";
  const isOffice = kind === "word" || kind === "excel" || kind === "powerpoint";
  const isVideo = kind === "video";
  const isAudio = kind === "audio";

  // Office Online viewer requires the file URL to be publicly reachable
  const officeViewerUrl = isOffice
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
    : null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden bg-black/95 border-white/10">
        <DialogHeader className="p-4 border-b border-white/10 flex flex-row items-center justify-between space-y-0 bg-black">
          <DialogTitle className="text-white text-sm font-medium truncate flex-1 pr-4">
            {fileName}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-white/70 hover:text-white hover:bg-white/10"
              onClick={handleDownload}
              title="Baixar"
            >
              <Download className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-white/70 hover:text-white hover:bg-white/10"
              asChild
              title="Abrir em nova aba"
            >
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-white/70 hover:text-white hover:bg-white/10"
              onClick={onClose}
            >
              <X className="size-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto flex items-center justify-center p-4 relative">
          {isImage ? (
            <img
              src={url}
              alt={fileName}
              className="max-w-full max-h-full object-contain"
            />
          ) : isPDF ? (
            <PdfDocumentViewer url={url} fileName={fileName} showActions={false} className="h-full rounded-sm" />
          ) : isOffice && officeViewerUrl ? (
            <iframe
              src={officeViewerUrl}
              className="w-full h-full rounded-sm bg-white"
              title={fileName}
            />
          ) : isVideo ? (
            <video src={url} controls className="max-w-full max-h-full" />
          ) : isAudio ? (
            <audio src={url} controls className="w-full max-w-md" />
          ) : (
            <div className="text-center space-y-4 max-w-sm">
              <div className="w-40 mx-auto">
                <FileThumbnail url={url} fileName={fileName} />
              </div>
              <p className="text-white/60 text-sm">
                Visualização não disponível para este tipo de arquivo.
              </p>
              <Button onClick={handleDownload} variant="secondary" className="gap-2">
                <Download className="size-4" /> Baixar para conferir
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
