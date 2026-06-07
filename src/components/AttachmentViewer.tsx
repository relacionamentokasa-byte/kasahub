import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, X, FileText, Loader2 } from "lucide-react";

interface AttachmentViewerProps {
  url: string | null;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AttachmentViewer({ url, fileName, isOpen, onClose }: AttachmentViewerProps) {
  if (!url) return null;

  const isImage = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileName);
  const isPDF = /\.pdf$/i.test(fileName);

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
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden bg-black/95 border-white/10">
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
            <iframe
              src={`${url}#toolbar=0`}
              className="w-full h-full rounded-sm bg-white"
              title={fileName}
            />
          ) : (
            <div className="text-center space-y-4">
              <div className="size-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto">
                <FileText className="size-10 text-white/20" />
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
