import React, { useState } from "react";
import {
  FileText,
  Download,
  Folder,
  Image as ImageIcon,
  Video,
  FileSpreadsheet,
  FileCode,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface PortalFileItem {
  id: string;
  name: string;
  url: string;
  type?: string | null;
  category?: string | null;
  created_at?: string;
  size?: string;
}

interface KasaFilesViewProps {
  files?: PortalFileItem[];
  clientBrandColor?: string;
}

const CATEGORIES = [
  { id: "all", label: "Todos os Arquivos" },
  { id: "brand", label: "Identidade & Marca" },
  { id: "arts", label: "Artes & Posts" },
  { id: "videos", label: "Vídeos & Reels" },
  { id: "docs", label: "Documentos & Contratos" },
];

export function KasaFilesView({
  files = [],
  clientBrandColor = "#FFBC45",
}: KasaFilesViewProps) {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const sampleFiles: PortalFileItem[] =
    files.length > 0
      ? files
      : [
          {
            id: "f-1",
            name: "Manual_de_Identidade_Visual_2026.pdf",
            url: "#",
            type: "pdf",
            category: "brand",
            created_at: "2026-09-10T12:00:00Z",
            size: "14.2 MB",
          },
          {
            id: "f-2",
            name: "Logotipo_Principal_Vetor.ai",
            url: "#",
            type: "ai",
            category: "brand",
            created_at: "2026-09-08T15:30:00Z",
            size: "8.5 MB",
          },
          {
            id: "f-3",
            name: "Banner_FISP_Stand_Impressao.pdf",
            url: "#",
            type: "pdf",
            category: "arts",
            created_at: "2026-09-15T09:00:00Z",
            size: "34.1 MB",
          },
          {
            id: "f-4",
            name: "Video_Institucional_Linha_EPI_Master.mp4",
            url: "#",
            type: "video",
            category: "videos",
            created_at: "2026-09-16T18:20:00Z",
            size: "185.0 MB",
          },
          {
            id: "f-5",
            name: "Planejamento_Estrategico_Q4_Kasa.pdf",
            url: "#",
            type: "pdf",
            category: "docs",
            created_at: "2026-09-14T11:00:00Z",
            size: "5.7 MB",
          },
        ];

  const filteredFiles = sampleFiles.filter((f) => {
    if (selectedCategory === "all") return true;
    return f.category === selectedCategory;
  });

  const getIcon = (type?: string | null) => {
    const t = (type || "").toLowerCase();
    if (t.includes("video") || t.includes("mp4") || t.includes("mov")) {
      return <Video className="size-4 text-purple-600" />;
    }
    if (t.includes("image") || t.includes("png") || t.includes("jpg") || t.includes("ai")) {
      return <ImageIcon className="size-4 text-amber-600" />;
    }
    if (t.includes("sheet") || t.includes("xls") || t.includes("csv")) {
      return <FileSpreadsheet className="size-4 text-emerald-600" />;
    }
    return <FileText className="size-4 text-blue-600" />;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* 1. Header do Módulo — Padrão Clean Kasa Hub */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E9E4DC] pb-4">
        <div>
          <span className="text-[10px] font-mono-kasa uppercase tracking-widest font-bold text-[#869296]">
            ATIVOS · BIBLIOTECA
          </span>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-[#0C1618] mt-0.5">
            Arquivos & Documentos
          </h1>
          <p className="text-xs text-[#6A787B] mt-0.5">
            Acesse artes finais, manuais de marca, vídeos e apresentações da sua empresa.
          </p>
        </div>

        {/* Categorias / Pastas em Pílula */}
        <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#E9E4DC] overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                selectedCategory === cat.id
                  ? "bg-white text-[#0C1618] shadow-xs font-bold"
                  : "text-[#869296] hover:text-[#0C1618]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Arquivos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFiles.map((file) => (
          <div
            key={file.id}
            className="bg-white border border-[#E9E4DC] rounded-xl p-4 hover:border-[#0C1618] hover:shadow-xs transition-all space-y-3 flex flex-col justify-between"
          >
            <div className="flex items-start gap-3">
              <div className="size-9 rounded-lg bg-[#FAF8F5] border border-[#E9E4DC] flex items-center justify-center shrink-0">
                {getIcon(file.type)}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-bold text-[#0C1618] truncate" title={file.name}>
                  {file.name}
                </h3>
                <p className="text-[11px] text-[#869296] font-mono-kasa mt-0.5">
                  {file.size || "Arquivo"} ·{" "}
                  {file.created_at
                    ? format(new Date(file.created_at), "dd/MM/yyyy", { locale: ptBR })
                    : "Recente"}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2.5 border-t border-[#F0EBE1]">
              <span className="text-[10px] uppercase font-bold text-[#869296] font-mono-kasa">
                Download disponível
              </span>
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="size-7 rounded-lg bg-[#FAF8F5] hover:bg-[#0C1618] text-[#0C1618] hover:text-white border border-[#E9E4DC] flex items-center justify-center transition"
                title="Baixar arquivo"
              >
                <Download className="size-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
