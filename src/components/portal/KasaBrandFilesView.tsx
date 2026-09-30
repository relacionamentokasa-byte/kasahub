import React, { useState } from "react";
import {
  FolderGit2,
  Download,
  Copy,
  Check,
  Sparkles,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Layers,
  Palette,
  Type,
  ExternalLink,
  Eye,
  MessageSquare,
  Clock,
  X,
  FileCode,
} from "lucide-react";
import { toast } from "sonner";

export interface BrandAsset {
  id: string;
  name: string;
  category: "logo" | "typography" | "palette" | "mockup" | "stationery";
  fileType: "AI" | "EPS" | "PDF" | "PNG" | "SVG" | "TTF";
  fileSize: string;
  downloadUrl: string;
  previewUrl?: string;
  description?: string;
  status?: "approved" | "pending" | "adjust_requested";
  feedback?: string;
}

interface KasaBrandFilesViewProps {
  clientBrandColor?: string;
  clientName?: string;
  clientLogoUrl?: string | null;
}

const SAMPLE_PALETTE = [
  { name: "Amarelo Âmbar (Primária)", hex: "#FFBC45", cmyk: "0, 27, 73, 0", rgb: "255, 188, 69" },
  { name: "Grafite Escuro Kasa", hex: "#121214", cmyk: "0, 0, 0, 92", rgb: "18, 18, 20" },
  { name: "Verde Petróleo Fundo", hex: "#0C1618", cmyk: "48, 7, 0, 90", rgb: "12, 22, 24" },
  { name: "Areia Neutro / Claro", hex: "#FAF8F5", cmyk: "0, 1, 2, 2", rgb: "250, 248, 245" },
  { name: "Cinza Médio de Apoio", hex: "#869296", cmyk: "11, 3, 0, 41", rgb: "134, 146, 150" },
];

const SAMPLE_ASSETS: BrandAsset[] = [
  {
    id: "ba-1",
    name: "Logotipo Principal (Vetor Editável)",
    category: "logo",
    fileType: "AI",
    fileSize: "4.8 MB",
    downloadUrl: "#",
    previewUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
    description: "Versão vetorial completa para impressão gráfica, estamparia e outdoors.",
  },
  {
    id: "ba-2",
    name: "Logo Fundo Transparente (Alta Resolução)",
    category: "logo",
    fileType: "PNG",
    fileSize: "1.2 MB",
    downloadUrl: "#",
    previewUrl: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800&auto=format&fit=crop&q=80",
    description: "Ideal para inserção em apresentações, assinaturas de e-mail e web.",
  },
  {
    id: "ba-3",
    name: "Manual de Identidade Visual Oficial (Brandbook)",
    category: "typography",
    fileType: "PDF",
    fileSize: "18.5 MB",
    downloadUrl: "#",
    previewUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80",
    description: "Diretrizes de aplicação, margens de respiro, proibições e tom de voz.",
  },
  {
    id: "ba-4",
    name: "Mockup Embalagem & Rótulo Linha Premium",
    category: "mockup",
    fileType: "PDF",
    fileSize: "12.4 MB",
    downloadUrl: "#",
    previewUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&auto=format&fit=crop&q=80",
    description: "Estudo de acabamento fosco com aplicação de verniz localizado.",
    status: "pending",
  },
  {
    id: "ba-5",
    name: "Apresentação Comercial Institucional Q4 (Deck PPT/PDF)",
    category: "stationery",
    fileType: "PDF",
    fileSize: "9.2 MB",
    downloadUrl: "#",
    previewUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80",
    description: "Template oficial de vendas com 24 slides estruturados.",
    status: "pending",
  },
];

export function KasaBrandFilesView({
  clientBrandColor = "#FFBC45",
  clientName = "Cliente",
  clientLogoUrl,
}: KasaBrandFilesViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"brandbook" | "downloads" | "approvals">("brandbook");
  const [assets, setAssets] = useState<BrandAsset[]>(SAMPLE_ASSETS);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<BrandAsset | null>(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");

  const handleCopyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    toast.success(`Código de cor ${hex} copiado!`);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  const handleApproveIdentity = (id: string) => {
    setAssets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "approved" } : a))
    );
    toast.success("Peça de identidade aprovada com sucesso!");
  };

  const handleRequestIdentityAdjust = (id: string) => {
    if (!feedbackText.trim()) return;
    setAssets((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "adjust_requested", feedback: feedbackText } : a
      )
    );
    toast.info("Solicitação de ajuste enviada para o time de branding!");
    setFeedbackText("");
    setIsFeedbackOpen(false);
  };

  const pendingApprovals = assets.filter((a) => a.status === "pending");

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      {/* 1. Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E9E4DC] pb-5">
        <div>
          <span className="text-[10px] font-mono-kasa uppercase tracking-widest font-bold text-[#869296] flex items-center gap-1.5">
            <Palette className="size-3.5 text-[#FFBC45]" />
            BRANDING & ARQUIVOS OFICIAIS · IDENTIDADE VISUAL
          </span>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-[#0C1618] mt-1">
            Brandbook & Identidade Visual
          </h1>
          <p className="text-xs text-[#6A787B] mt-0.5">
            Central oficial da sua marca: baixe vetores em alta resolução, consulte paleta de cores e aprove novas aplicações.
          </p>
        </div>

        {/* Sub-abas de Navegação Interna */}
        <div className="flex items-center gap-1 bg-[#F5F2EC] p-1 rounded-xl border border-[#E9E4DC]">
          <button
            type="button"
            onClick={() => setActiveSubTab("brandbook")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === "brandbook"
                ? "bg-white text-[#0C1618] shadow-xs"
                : "text-[#869296] hover:text-[#0C1618]"
            }`}
          >
            Brandbook & Cores
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("downloads")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === "downloads"
                ? "bg-white text-[#0C1618] shadow-xs"
                : "text-[#869296] hover:text-[#0C1618]"
            }`}
          >
            Downloads de Arquivos ({assets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("approvals")}
            className={`relative px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === "approvals"
                ? "bg-white text-[#0C1618] shadow-xs"
                : "text-[#869296] hover:text-[#0C1618]"
            }`}
          >
            Aprovações de Identidade
            {pendingApprovals.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-[#FFBC45] text-[#0C1618] text-[9px] font-bold">
                {pendingApprovals.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: BRANDBOOK INTERATIVO & PALETA DE CORES                             */}
      {/* ========================================================================= */}
      {activeSubTab === "brandbook" && (
        <div className="space-y-8">
          {/* Card Hero: Identidade da Marca do Cliente */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#121214] via-[#18181B] to-[#0C1618] text-white border border-white/10 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3 max-w-xl text-center md:text-left">
              <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-[#FFBC45] flex items-center justify-center md:justify-start gap-1.5">
                <Sparkles className="size-3" /> GUIA OFICIAL DE MARCA
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Identidade Visual {clientName}
              </h2>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                Desenvolvida estrategicamente para transmitir autoridade, diferenciação no mercado e consistência em todos os pontos de contato físicos e digitais.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
                <a
                  href="#"
                  className="px-4 py-2 rounded-xl bg-[#FFBC45] hover:bg-[#F2AC35] text-[#09090B] font-bold text-xs flex items-center gap-2 shadow-md transition active:scale-95"
                >
                  <Download className="size-3.5" /> Baixar Manual de Marca Completo (PDF)
                </a>
              </div>
            </div>

            {/* Visual do Logo Oficial */}
            <div className="size-32 sm:size-40 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-4 flex items-center justify-center shrink-0">
              {clientLogoUrl ? (
                <img src={clientLogoUrl} alt={clientName} className="max-h-full max-w-full object-contain" />
              ) : (
                <div
                  className="size-20 rounded-2xl flex items-center justify-center text-3xl font-display font-black text-[#0C1618]"
                  style={{ backgroundColor: clientBrandColor }}
                >
                  {clientName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Paleta Oficial de Cores (Copia Hexadecimal em 1 Clique) */}
          <div className="space-y-4">
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold text-[#0C1618]">
                Paleta Cromática Oficial
              </h3>
              <p className="text-xs text-[#6A787B]">
                Clique em qualquer cor para copiar instantaneamente o código Hexadecimal.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {SAMPLE_PALETTE.map((color, idx) => (
                <div
                  key={idx}
                  onClick={() => handleCopyHex(color.hex)}
                  className="group p-3 rounded-2xl bg-white border border-[#E9E4DC] shadow-xs hover:shadow-md hover:border-amber-300 transition cursor-pointer space-y-2.5"
                >
                  <div
                    className="w-full h-20 rounded-xl shadow-inner relative flex items-end justify-end p-2 transition group-hover:scale-[1.02]"
                    style={{ backgroundColor: color.hex }}
                  >
                    <span className="p-1 rounded-md bg-black/40 backdrop-blur-xs text-white opacity-0 group-hover:opacity-100 transition">
                      {copiedHex === color.hex ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-display text-xs font-bold text-[#0C1618] line-clamp-1">
                      {color.name}
                    </h4>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono text-[11px] font-bold text-[#FFBC45] bg-[#121214] px-1.5 py-0.5 rounded-md">
                        {color.hex}
                      </span>
                      <span className="text-[9px] text-[#869296] font-mono">
                        {copiedHex === color.hex ? "Copiado!" : "Copiar"}
                      </span>
                    </div>
                    <div className="mt-1.5 text-[9px] text-[#869296] space-y-0.5">
                      <div>RGB: {color.rgb}</div>
                      <div>CMYK: {color.cmyk}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tipografias Institucionais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-[#E9E4DC] shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-[#869296]">
                <Type className="size-4 text-[#FFBC45]" />
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider">
                  TIPOGRAFIA PRINCIPAL (TÍTULOS)
                </span>
              </div>
              <h4 className="font-display text-2xl font-bold text-[#0C1618]">
                Funnel Display & Titling
              </h4>
              <p className="text-xs text-[#6A787B] leading-relaxed">
                Utilizada para grandes manchetes, chamadas publicitárias e títulos institucionais de alto impacto visual.
              </p>
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E9E4DC] text-xs font-mono text-[#0C1618]">
                Aa Bb Cc Dd Ee Ff Gg Hh 1234567890 !@#$%
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E9E4DC] shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-[#869296]">
                <Type className="size-4 text-blue-600" />
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider">
                  TIPOGRAFIA SECUNDÁRIA (TEXTOS E LEITURA)
                </span>
              </div>
              <h4 className="font-sans text-2xl font-bold text-[#0C1618]">
                Onest Pro Regular & Bold
              </h4>
              <p className="text-xs text-[#6A787B] leading-relaxed">
                Desenhada para legibilidade contínua em telas e impressos, garantindo clareza na leitura de contratos e posts.
              </p>
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E9E4DC] text-xs font-sans text-[#0C1618]">
                Aa Bb Cc Dd Ee Ff Gg Hh 1234567890 !@#$%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: DOWNLOAD DE ARQUIVOS EM ALTA RESOLUÇÃO                              */}
      {/* ========================================================================= */}
      {activeSubTab === "downloads" && (
        <div className="space-y-4">
          <div>
            <h3 className="font-display text-lg font-bold text-[#0C1618]">
              Arquivos & Pacotes Vetoriais
            </h3>
            <p className="text-xs text-[#6A787B]">
              Baixe versões editáveis e em alta definição para uso da sua equipe e fornecedores.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="p-4 rounded-2xl bg-white border border-[#E9E4DC] shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md bg-[#121214] text-white font-mono text-[10px] font-bold">
                      .{asset.fileType}
                    </span>
                    <span className="text-[11px] font-mono text-[#869296] font-semibold">
                      {asset.fileSize}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-display text-sm font-bold text-[#0C1618]">
                      {asset.name}
                    </h4>
                    <p className="text-xs text-[#6A787B] mt-1 leading-relaxed">
                      {asset.description}
                    </p>
                  </div>
                </div>

                <a
                  href={asset.downloadUrl}
                  className="w-full py-2 px-3 rounded-xl bg-[#FAF8F5] hover:bg-[#F0ECE4] border border-[#E9E4DC] text-xs font-bold text-[#0C1618] flex items-center justify-center gap-1.5 transition active:scale-98"
                >
                  <Download className="size-3.5 text-[#FFBC45]" />
                  <span>Baixar Arquivo Oficial</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: APROVAÇÕES DE IDENTIDADE (MOCKUPS, PAPELARIA & EMBALAGENS)          */}
      {/* ========================================================================= */}
      {activeSubTab === "approvals" && (
        <div className="space-y-6">
          <div>
            <h3 className="font-display text-lg font-bold text-[#0C1618]">
              Aprovação de Materiais & Mockups de Identidade
            </h3>
            <p className="text-xs text-[#6A787B]">
              Valide as peças de apoio antes do envio para gráfica ou implementação.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {assets
              .filter((a) => a.category === "mockup" || a.category === "stationery")
              .map((asset) => {
                const isApproved = asset.status === "approved";
                const isAdjust = asset.status === "adjust_requested";

                return (
                  <div
                    key={asset.id}
                    className="bg-white rounded-2xl border border-[#E9E4DC] overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Preview do Mockup */}
                      <div className="relative aspect-[16/10] bg-[#121214] overflow-hidden group">
                        <img
                          src={asset.previewUrl}
                          alt={asset.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute top-2.5 right-2.5">
                          {isApproved ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-md">
                              <CheckCircle2 className="size-3" /> Aprovado para Produção
                            </span>
                          ) : isAdjust ? (
                            <span className="px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-md">
                              <Clock className="size-3" /> Ajuste Solicitado
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-[#FFBC45] text-[#0C1618] text-[10px] font-bold shadow-md">
                              Aguardando Sua Aprovação
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Conteúdo */}
                      <div className="p-4 space-y-2">
                        <h4 className="font-display text-base font-bold text-[#0C1618]">
                          {asset.name}
                        </h4>
                        <p className="text-xs text-[#6A787B] leading-relaxed">
                          {asset.description}
                        </p>

                        {isAdjust && asset.feedback && (
                          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                            <strong>Ajuste solicitado:</strong> {asset.feedback}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="p-4 pt-0 border-t border-[#F5F2EC] flex items-center gap-2">
                      {!isApproved ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApproveIdentity(asset.id)}
                            style={{ backgroundColor: clientBrandColor }}
                            className="flex-1 py-2 rounded-xl text-xs font-bold text-[#0C1618] flex items-center justify-center gap-1.5 shadow-xs hover:opacity-90 transition active:scale-95 cursor-pointer"
                          >
                            <Check className="size-3.5" />
                            <span>Aprovar Peça</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAsset(asset);
                              setIsFeedbackOpen(true);
                            }}
                            className="p-2 rounded-xl border border-[#E9E4DC] hover:bg-[#FAF8F5] text-[#6A787B] hover:text-[#0C1618] text-xs font-bold transition flex items-center justify-center cursor-pointer"
                            title="Solicitar Ajuste"
                          >
                            <MessageSquare className="size-3.5" />
                          </button>
                        </>
                      ) : (
                        <div className="w-full py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="size-3.5" /> Aprovado para Produção Gráfica
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Modal de Solicitação de Ajuste de Identidade */}
      {isFeedbackOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 border border-[#E9E4DC] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-[#0C1618]">
                Solicitar Ajuste no Material
              </h3>
              <button
                type="button"
                onClick={() => setIsFeedbackOpen(false)}
                className="p-1 text-[#869296] hover:text-[#0C1618]"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-[#6A787B]">
              Descreva os pontos de alteração para o time de design da Kasa (ex: alterar tipografia, trocar acabamento de verniz, ajustar texto).
            </p>

            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Digite aqui os ajustes desejados..."
              className="w-full h-28 p-3 rounded-xl border border-[#E9E4DC] text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none font-sans"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsFeedbackOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#869296] hover:bg-[#F5F2EC] transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleRequestIdentityAdjust(selectedAsset.id)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#121214] text-white hover:bg-[#27272A] transition"
              >
                Enviar ao Time Kasa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
