import { useEffect, useState } from "react";
import { Printer, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { brlForce as brl } from "@/lib/utils-format";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  transaction: any | null;
}

function valorPorExtenso(valor: number): string {
  if (!valor) return "zero reais";
  const reais = Math.floor(valor);
  const centavos = Math.round((valor - reais) * 100);
  const unid = ["","um","dois","três","quatro","cinco","seis","sete","oito","nove","dez","onze","doze","treze","quatorze","quinze","dezesseis","dezessete","dezoito","dezenove"];
  const dez = ["","","vinte","trinta","quarenta","cinquenta","sessenta","setenta","oitenta","noventa"];
  const cent = ["","cento","duzentos","trezentos","quatrocentos","quinhentos","seiscentos","setecentos","oitocentos","novecentos"];
  function ate999(n: number): string {
    if (n === 0) return "";
    if (n === 100) return "cem";
    const c = Math.floor(n/100), d = Math.floor((n%100)/10), u = n%10;
    const parts: string[] = [];
    if (c) parts.push(cent[c]);
    if (d === 1) parts.push(unid[10+u]);
    else {
      if (d) parts.push(dez[d]);
      if (u) parts.push(unid[u]);
    }
    return parts.join(" e ");
  }
  function nome(n: number): string {
    if (n === 0) return "zero";
    if (n < 1000) return ate999(n);
    const milhoes = Math.floor(n/1000000);
    const milhares = Math.floor((n%1000000)/1000);
    const resto = n%1000;
    const parts: string[] = [];
    if (milhoes) parts.push((milhoes === 1 ? "um milhão" : ate999(milhoes)+" milhões"));
    if (milhares) parts.push((milhares === 1 ? "mil" : ate999(milhares)+" mil"));
    if (resto) parts.push(ate999(resto));
    return parts.join(" e ");
  }
  let s = `${nome(reais)} ${reais === 1 ? "real" : "reais"}`;
  if (centavos) s += ` e ${nome(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`;
  return s;
}

export function ReciboDialog({ open, onOpenChange, transaction }: Props) {
  const [agency, setAgency] = useState<any>(null);
  const [numero, setNumero] = useState("");
  const [pagador, setPagador] = useState("");
  const [pagadorDoc, setPagadorDoc] = useState("");
  const [refer, setRefer] = useState("");
  const [local, setLocal] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !transaction) return;
    setLoading(true);
    supabase.from("agency_settings").select("*").maybeSingle().then(({ data }) => {
      setAgency(data);
      setLocal(data?.address ? String(data.address).split(",").slice(-2).join(",").trim() : "");
      setLoading(false);
    });
    setNumero(`REC-${String(transaction.id).slice(0, 8).toUpperCase()}`);
    const c = transaction.clients;
    setPagador(c?.name || c?.company || "");
    setPagadorDoc(c?.document || "");
    setRefer(transaction.description || "");
  }, [open, transaction]);

  if (!transaction) return null;

  if (transaction.status !== "paid") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Recibo indisponível</DialogTitle>
            <DialogDescription>
              O recibo só pode ser gerado depois que o lançamento estiver marcado como pago/recebido.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const valor = Number(transaction.amount || 0);
  const dataPg = transaction.payment_date || transaction.due_date;

  function imprimir() {
    const html = buildHtml({
      agency, numero, valor, valorExtenso: valorPorExtenso(valor),
      pagador, pagadorDoc, refer, local, dataPg,
    });
    const w = window.open("", "_blank", "width=820,height=900");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 350);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="size-5 text-primary" /> Gerar recibo
          </DialogTitle>
          <DialogDescription>
            {(transaction as any).number_display ? `${(transaction as any).number_display} · ` : ""}{transaction.description} · {brl(valor)}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin" /></div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nº do recibo</Label>
                <Input value={numero} onChange={(e) => setNumero(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Local</Label>
                <Input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Cidade/UF" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Recebemos de</Label>
              <Input value={pagador} onChange={(e) => setPagador(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">CPF/CNPJ do pagador</Label>
              <Input value={pagadorDoc} onChange={(e) => setPagadorDoc(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Referente a</Label>
              <Textarea value={refer} onChange={(e) => setRefer(e.target.value)} rows={3} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={imprimir} className="gap-2">
            <Printer className="size-4" /> Imprimir / Salvar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function buildHtml(d: {
  agency: any; numero: string; valor: number; valorExtenso: string;
  pagador: string; pagadorDoc: string; refer: string; local: string; dataPg: string;
}) {
  const a = d.agency || {};
  const displayName = a.legal_name || a.name || "";
  const logo = a.logo_url || a.logo_reports_url || a.logo_black_url || "";
  const dataFmt = new Date(d.dataPg + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const valorFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(d.valor);
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/>
<title>Recibo ${d.numero}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;padding:40px;background:#fff}
  .sheet{max-width:720px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;padding:40px;position:relative}
  header{display:flex;justify-content:space-between;align-items:start;border-bottom:2px solid #111;padding-bottom:16px;margin-bottom:24px}
  .brand h1{font-size:14px;letter-spacing:.15em;text-transform:uppercase;color:#6b7280}
  .brand h2{font-size:22px;font-weight:700;margin-top:4px}
  .brand p{font-size:11px;color:#6b7280;margin-top:2px}
  .logo{max-height:60px;max-width:180px;object-fit:contain}
  .meta{display:flex;justify-content:space-between;margin-bottom:24px;font-size:13px}
  .meta .val{background:#111;color:#fff;padding:10px 18px;border-radius:8px;font-weight:700;font-size:18px;font-variant-numeric:tabular-nums}
  .body{font-size:14px;line-height:1.85;margin-bottom:40px;text-align:justify}
  .body strong{font-weight:700}
  .sign{margin-top:60px;text-align:center;font-size:13px}
  .sign .line{border-top:1px solid #111;width:320px;margin:0 auto 6px}
  .foot{margin-top:32px;padding-top:16px;border-top:1px dashed #d1d5db;font-size:10px;color:#9ca3af;text-align:center}
  @media print {body{padding:0} .sheet{border:none}}
</style></head>
<body>
  <div class="sheet">
    <header>
      <div class="brand">
        <h1>Recibo de Pagamento</h1>
        <h2>${escape(displayName)}</h2>
        ${a.document ? `<p>CNPJ/CPF: ${escape(a.document)}</p>` : ""}
        ${a.address ? `<p>${escape(a.address)}</p>` : ""}
        ${a.email || a.phone ? `<p>${escape(a.email || "")}${a.email && a.phone ? " · " : ""}${escape(a.phone || "")}</p>` : ""}
      </div>
      ${logo ? `<img class="logo" src="${escape(logo)}" alt="logo"/>` : ""}
    </header>

    <div class="meta">
      <div><strong>Nº ${escape(d.numero)}</strong></div>
      <div class="val">${valorFmt}</div>
    </div>

    <p class="body">
      Recebemos de <strong>${escape(d.pagador)}</strong>${d.pagadorDoc ? `, inscrito(a) no CPF/CNPJ sob nº <strong>${escape(d.pagadorDoc)}</strong>` : ""},
      a importância de <strong>${valorFmt}</strong> (<em>${escape(d.valorExtenso)}</em>),
      referente a <strong>${escape(d.refer)}</strong>.
      <br/><br/>
      Para clareza e validade do que aqui foi declarado, firmo o presente recibo, dando plena, geral e irrevogável quitação da quantia ora recebida.
    </p>

    <p style="font-size:13px;text-align:right;margin-bottom:48px">${escape(d.local || "")}${d.local ? ", " : ""}${dataFmt}.</p>

    <div class="sign">
      <div class="line"></div>
      <div><strong>${escape(displayName)}</strong></div>
      ${a.document ? `<div style="color:#6b7280;font-size:11px">${escape(a.document)}</div>` : ""}
    </div>

    <div class="foot">Documento emitido eletronicamente · ${new Date().toLocaleString("pt-BR")}</div>
  </div>
  <script>window.onafterprint=()=>window.close()</script>
</body></html>`;
}

function escape(s: string) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]!));
}
