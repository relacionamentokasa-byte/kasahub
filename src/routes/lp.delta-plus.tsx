import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  ShieldCheck,
  Factory,
  Globe2,
  BadgeCheck,
  HeadphonesIcon,
  HardHat,
  Hand,
  Shirt,
  Footprints,
  MoveVertical,
  CheckCircle2,
  XCircle,
  MessageCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";
import heroImg from "@/assets/delta-plus-hero.jpg";
import deltaLogoAsset from "@/assets/delta-plus-logo.png.asset.json";
const deltaLogo = deltaLogoAsset.url;
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/lp/delta-plus")({
  head: () => ({
    meta: [
      { title: "Distribuidor Autorizado Delta Plus — EPIs no Atacado | Kasa" },
      {
        name: "description",
        content:
          "Linha completa de EPIs Delta Plus com preço de atacado. Fabricação própria desde 1977, certificação internacional, estoque pronto para entrega no Brasil.",
      },
      { property: "og:title", content: "Distribuidor Autorizado Delta Plus — EPIs no Atacado" },
      {
        property: "og:description",
        content:
          "Solicite cotação personalizada de EPIs Delta Plus para revenda. Margem competitiva, entrega rápida e suporte comercial dedicado.",
      },
      { property: "og:image", content: heroImg },
      { name: "twitter:image", content: heroImg },
    ],
  }),
  component: DeltaPlusLanding,
});

// TODO: substituir pelo número comercial real da Kasa
const WHATSAPP_NUMBER = "5500000000000";
const WHATSAPP_MSG = encodeURIComponent(
  "Olá! Vim pela página do Delta Plus e gostaria de uma cotação.",
);
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`;

// TODO: configurar webhook (Google Sheets / Apps Script Web App URL)
const FORM_WEBHOOK_URL = "";

const productCategories = [
  {
    key: "cabeca",
    title: "Cabeça",
    Icon: HardHat,
    items: ["Capacetes de segurança", "Viseiras e protetores faciais", "Protetores auriculares (plugues e abafadores)"],
  },
  {
    key: "maos",
    title: "Mãos",
    Icon: Hand,
    items: ["Luvas anti-corte", "Luvas para produtos químicos", "Luvas térmicas e mecânicas"],
  },
  {
    key: "corpo",
    title: "Corpo",
    Icon: Shirt,
    items: ["Vestimentas industriais", "Aventais de proteção", "Coletes de alta visibilidade"],
  },
  {
    key: "pes",
    title: "Pés",
    Icon: Footprints,
    items: ["Calçados de segurança", "Botas impermeáveis", "Sapatos com biqueira composite"],
  },
  {
    key: "altura",
    title: "Altura",
    Icon: MoveVertical,
    items: ["Cintos de segurança", "Talabartes", "Travas-quedas", "Absorvedores de energia"],
  },
];

const stats = [
  { value: "+110", label: "Países" },
  { value: "1977", label: "Fundação" },
  { value: "40+", label: "Anos no Brasil" },
  { value: "100%", label: "Satisfação" },
];

const benefits = [
  {
    Icon: Factory,
    title: "Fabricação Própria",
    text: "Controle total de qualidade e inovação desde 1977.",
  },
  {
    Icon: Globe2,
    title: "Presença Global",
    text: "Presente em mais de 110 países ao redor do mundo.",
  },
  {
    Icon: BadgeCheck,
    title: "Certificação Total",
    text: "Todos os produtos com certificação INMETRO e ISO.",
  },
  {
    Icon: HeadphonesIcon,
    title: "Suporte Comercial",
    text: "Equipe dedicada de consultores para revenda.",
  },
];

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function DeltaPlusLanding() {
  return (
    <div className="min-h-screen bg-white text-[#11263B] font-[Inter,system-ui,sans-serif]">
      <style>{`
        html { scroll-behavior: smooth; }
      `}</style>
      <Header />
      <Hero />
      <PainSolution />
      <WhyDistribute />
      <Products />
      <Stats />
      <LeadForm />
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 bg-[#11263B] text-white border-b border-white/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={deltaLogo} alt="Delta Plus" className="h-9 w-auto object-contain" />
          <span className="hidden sm:inline text-sm text-white/70 border-l border-white/20 pl-3">Distribuidor Autorizado</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-white/80">
          <a href="#produtos" className="hover:text-[#FFBC45]">Produtos</a>
          <a href="#beneficios" className="hover:text-[#FFBC45]">Por que Delta Plus</a>
          <a href="#numeros" className="hover:text-[#FFBC45]">Números</a>
          <a href="#cotacao" className="hover:text-[#FFBC45]">Cotação</a>
        </nav>
        <a
          href="#cotacao"
          className="inline-flex items-center gap-2 rounded-md bg-[#FF8C00] hover:bg-[#e57e00] text-white px-4 py-2 text-sm font-semibold transition"
        >
          Cotação <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroImg}
          alt="Operário utilizando EPI Delta Plus completo em ambiente industrial"
          className="w-full h-full object-cover"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#11263B]/95 via-[#11263B]/80 to-[#11263B]/40" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-20 md:py-32 text-white">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#FFBC45]/15 border border-[#FFBC45]/30 px-3 py-1 text-xs font-semibold text-[#FFBC45]">
            <ShieldCheck className="w-4 h-4" /> Distribuidor Autorizado Delta Plus
          </div>
          <h1 className="mt-5 text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight">
            Linha Completa de EPIs com{" "}
            <span className="text-[#FFBC45]">Preço de Atacado</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-white/85 max-w-xl">
            Fabricação própria desde 1977. Certificação internacional. Estoque pronto para entrega
            em todo o Brasil.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <a
              href="#cotacao"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#FF8C00] hover:bg-[#e57e00] text-white px-6 py-4 font-bold shadow-lg shadow-[#FF8C00]/30 transition"
            >
              Solicitar Cotação Agora <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] hover:bg-[#1ebe5a] text-white px-6 py-4 font-bold transition"
            >
              <MessageCircle className="w-5 h-5" /> Falar com Consultor no WhatsApp
            </a>
          </div>

          <div className="mt-8 flex flex-wrap gap-2 text-xs">
            {["ISO 9001", "Certificado INMETRO", "Desde 1977"].map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1.5 font-semibold backdrop-blur"
              >
                <BadgeCheck className="w-3.5 h-3.5 text-[#FFBC45]" /> {s}
              </span>
            ))}
          </div>

          <p className="mt-5 text-sm text-white/80">
            ✅ Mais de 110 países &nbsp;|&nbsp; ✅ De fábrica direto para você
          </p>
        </div>
      </div>
    </section>
  );
}

function PainSolution() {
  const pains = [
    "Fornecedor que não entrega no prazo?",
    "Produto que chega sem certificação?",
    "Preço que não cabe na sua margem?",
  ];
  const solutions = [
    "Delta Plus: uma das maiores fábricas de EPI do mundo",
    "Estoque no Brasil, entrega rápida e confiável",
    "Margem competitiva para revenda",
  ];
  return (
    <section className="py-16 md:py-24 bg-[#F7F8FA]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-center text-2xl sm:text-4xl font-extrabold tracking-tight max-w-3xl mx-auto">
          Você sabe quanto tempo perde procurando EPI de qualidade com preço justo?
        </h2>
        <div className="mt-12 grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-white border border-red-100 p-6 md:p-8 shadow-sm">
            <h3 className="font-bold text-lg text-red-600 mb-5">O problema de sempre</h3>
            <ul className="space-y-4">
              {pains.map((p) => (
                <li key={p} className="flex gap-3">
                  <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <span className="text-[#11263B]/90">{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-[#11263B] text-white p-6 md:p-8 shadow-lg">
            <h3 className="font-bold text-lg text-[#FFBC45] mb-5">A solução Delta Plus</h3>
            <ul className="space-y-4">
              {solutions.map((s) => (
                <li key={s} className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#FFBC45] shrink-0 mt-0.5" />
                  <span className="text-white/90">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhyDistribute() {
  return (
    <section id="beneficios" className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold tracking-widest text-[#FF8C00] uppercase">
            Por que distribuir
          </span>
          <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold tracking-tight">
            4 razões para revender Delta Plus
          </h2>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {benefits.map(({ Icon, title, text }) => (
            <div
              key={title}
              className="group rounded-2xl border border-[#11263B]/10 p-6 hover:border-[#FFBC45] hover:shadow-lg transition bg-white"
            >
              <div className="w-12 h-12 rounded-xl bg-[#11263B] text-[#FFBC45] grid place-items-center group-hover:bg-[#FFBC45] group-hover:text-[#11263B] transition">
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="mt-5 font-bold text-lg">{title}</h3>
              <p className="mt-2 text-sm text-[#11263B]/70 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Products() {
  return (
    <section id="produtos" className="py-16 md:py-24 bg-[#11263B] text-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold tracking-widest text-[#FFBC45] uppercase">
            Linha completa
          </span>
          <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold tracking-tight">
            Proteção da cabeça aos pés
          </h2>
          <p className="mt-3 text-white/70">
            Clique em uma categoria para ver os produtos disponíveis.
          </p>
        </div>

        <div className="mt-12 max-w-3xl mx-auto rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-2 sm:p-4">
          <Accordion type="single" collapsible className="w-full">
            {productCategories.map(({ key, title, Icon, items }) => (
              <AccordionItem
                key={key}
                value={key}
                className="border-white/10 last:border-b-0"
              >
                <AccordionTrigger className="px-4 py-5 hover:no-underline">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#FFBC45] text-[#11263B] grid place-items-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-base sm:text-lg text-white">{title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-5">
                  <ul className="grid sm:grid-cols-2 gap-2 pl-14 text-white/80">
                    {items.map((it) => (
                      <li key={it} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-[#FFBC45] shrink-0" />
                        {it}
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  return (
    <section id="numeros" className="py-16 md:py-20 bg-[#FFBC45]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-[#11263B]">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-4xl sm:text-6xl font-black tracking-tight">{s.value}</div>
            <div className="mt-2 text-sm sm:text-base font-semibold uppercase tracking-widest">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const PRODUCT_OPTIONS = productCategories.map((c) => c.title);
const VOLUMES = ["Até R$ 5k", "R$ 5-20k", "R$ 20-50k", "R$ 50k+"];

function LeadForm() {
  const [form, setForm] = useState({
    nome: "",
    empresa: "",
    whatsapp: "",
    email: "",
    cidade: "",
    produtos: [] as string[],
    volume: "",
    mensagem: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nome.trim()) e.nome = "Informe seu nome";
    if (!form.empresa.trim()) e.empresa = "Informe a empresa";
    if (form.whatsapp.replace(/\D/g, "").length < 10) e.whatsapp = "WhatsApp inválido";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "E-mail inválido";
    if (!form.cidade.trim()) e.cidade = "Informe cidade/estado";
    if (form.produtos.length === 0) e.produtos = "Selecione ao menos um produto";
    if (!form.volume) e.volume = "Selecione o volume";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (FORM_WEBHOOK_URL) {
        await fetch(FORM_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, source: "lp-delta-plus", ts: new Date().toISOString() }),
        });
      }
      // GTM tracking
      if (typeof window !== "undefined" && (window as any).dataLayer) {
        (window as any).dataLayer.push({ event: "lead_submitted", form: "delta-plus" });
      }
      setSuccess(true);
    } catch {
      setSuccess(true); // ainda mostra sucesso; consultor entrará em contato via outro canal
    } finally {
      setSubmitting(false);
    }
  };

  const toggleProduct = (p: string) => {
    setForm((f) =>
      f.produtos.includes(p)
        ? { ...f, produtos: f.produtos.filter((x) => x !== p) }
        : { ...f, produtos: [...f.produtos, p] },
    );
  };

  if (success) return <ThankYou />;

  return (
    <section id="cotacao" className="py-16 md:py-24 bg-[#F7F8FA]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Solicite sua Cotação Personalizada
          </h2>
          <p className="mt-3 text-[#11263B]/70">
            Responda em até 2 minutos. Um consultor entra em contato.
          </p>
        </div>

        <div className="mt-12 grid lg:grid-cols-[2fr_1fr] gap-6">
          <form
            onSubmit={handleSubmit}
            noValidate
            className="rounded-2xl bg-white border border-[#11263B]/10 p-6 md:p-8 shadow-sm space-y-5"
          >
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Nome completo" error={errors.nome}>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className={inputCls(errors.nome)}
                  placeholder="João Silva"
                />
              </Field>
              <Field label="Nome da empresa" error={errors.empresa}>
                <input
                  type="text"
                  value={form.empresa}
                  onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                  className={inputCls(errors.empresa)}
                  placeholder="Sua Loja LTDA"
                />
              </Field>
              <Field label="WhatsApp" error={errors.whatsapp}>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: maskPhone(e.target.value) })}
                  className={inputCls(errors.whatsapp)}
                  placeholder="(11) 99999-9999"
                />
              </Field>
              <Field label="E-mail" error={errors.email}>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputCls(errors.email)}
                  placeholder="contato@empresa.com.br"
                />
              </Field>
              <Field label="Cidade / Estado" error={errors.cidade}>
                <input
                  type="text"
                  value={form.cidade}
                  onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                  className={inputCls(errors.cidade)}
                  placeholder="São Paulo / SP"
                />
              </Field>
              <Field label="Volume estimado mensal" error={errors.volume}>
                <select
                  value={form.volume}
                  onChange={(e) => setForm({ ...form, volume: e.target.value })}
                  className={inputCls(errors.volume)}
                >
                  <option value="">Selecione...</option>
                  {VOLUMES.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Produtos de interesse" error={errors.produtos}>
              <div className="flex flex-wrap gap-2">
                {PRODUCT_OPTIONS.map((p) => {
                  const active = form.produtos.includes(p);
                  return (
                    <button
                      type="button"
                      key={p}
                      onClick={() => toggleProduct(p)}
                      className={`px-3 py-2 rounded-full text-sm font-semibold border transition ${
                        active
                          ? "bg-[#11263B] text-white border-[#11263B]"
                          : "bg-white text-[#11263B] border-[#11263B]/20 hover:border-[#11263B]"
                      }`}
                    >
                      {active ? "✓ " : ""}
                      {p}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Mensagem (opcional)">
              <textarea
                rows={3}
                value={form.mensagem}
                onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
                className={inputCls()}
                placeholder="Conte um pouco sobre seu negócio..."
              />
            </Field>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#FF8C00] hover:bg-[#e57e00] text-white px-6 py-4 font-bold text-lg shadow-lg shadow-[#FF8C00]/30 transition disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Enviando...
                </>
              ) : (
                <>
                  Quero ser Distribuidor Delta Plus <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            <p className="text-xs text-[#11263B]/50 text-center">
              Seus dados estão seguros e serão usados apenas para contato comercial.
            </p>
          </form>

          <aside className="rounded-2xl bg-gradient-to-br from-[#11263B] to-[#0a1a2c] text-white p-6 md:p-8 shadow-lg flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-[#25D366]/20 grid place-items-center text-[#25D366] mb-5">
              <MessageCircle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold leading-tight">
              Prefere falar agora?
            </h3>
            <p className="mt-3 text-white/75 text-sm leading-relaxed">
              Clique abaixo e fale direto com nosso time comercial no WhatsApp. Atendimento
              imediato em horário comercial.
            </p>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto pt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] hover:bg-[#1ebe5a] text-white px-5 py-3.5 font-bold transition"
            >
              <MessageCircle className="w-5 h-5" /> Falar no WhatsApp
            </a>
          </aside>
        </div>
      </div>
    </section>
  );
}

function ThankYou() {
  return (
    <section id="cotacao" className="py-24 md:py-32 bg-[#F7F8FA]">
      <div className="mx-auto max-w-xl px-4 sm:px-6 text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-[#FFBC45] grid place-items-center">
          <CheckCircle2 className="w-10 h-10 text-[#11263B]" />
        </div>
        <h2 className="mt-6 text-3xl sm:text-4xl font-extrabold tracking-tight">
          Recebemos sua solicitação!
        </h2>
        <p className="mt-4 text-[#11263B]/70 text-lg">
          Em até <strong>24h úteis</strong> um consultor entrará em contato com sua proposta
          personalizada.
        </p>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] hover:bg-[#1ebe5a] text-white px-6 py-4 font-bold transition"
        >
          <MessageCircle className="w-5 h-5" /> Falar agora no WhatsApp
        </a>
      </div>
    </section>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-[#11263B] mb-1.5">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-600 font-medium">{error}</span> : null}
    </label>
  );
}

function inputCls(error?: string) {
  return `w-full rounded-lg border bg-white px-3.5 py-3 text-[#11263B] placeholder:text-[#11263B]/40 outline-none transition focus:border-[#FF8C00] focus:ring-2 focus:ring-[#FF8C00]/20 ${
    error ? "border-red-400" : "border-[#11263B]/15"
  }`;
}

function Footer() {
  return (
    <footer className="bg-[#0a1a2c] text-white/70 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-3">
          <img src={deltaLogo} alt="Delta Plus" className="h-8 w-auto object-contain" />
          <span>Distribuidor Autorizado</span>
        </div>
        <p>© {new Date().getFullYear()} Kasa. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}

function FloatingWhatsApp() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#1ebe5a] text-white grid place-items-center shadow-xl shadow-[#25D366]/40 transition hover:scale-105"
    >
      <MessageCircle className="w-7 h-7" />
    </a>
  );
}
