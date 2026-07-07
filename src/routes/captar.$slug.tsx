import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { StorageImage } from "@/components/ui/storage-image";

type LandingConfig = {
  id: string;
  name: string;
  slug: string;
  landing_headline: string | null;
  landing_subheadline: string | null;
  landing_description: string | null;
  landing_cta_label: string | null;
  landing_logo_url: string | null;
  landing_hero_image_url: string | null;
  landing_bg_color: string | null;
  landing_accent_color: string | null;
  landing_benefits: Array<{ title: string; description?: string }>;
  landing_testimonials: Array<{ author: string; text: string; role?: string }>;
  landing_form_fields: string[];
  landing_success_message: string | null;
  landing_redirect_url: string | null;
  pixel_meta_id: string | null;
  gtag_id: string | null;
};

export const Route = createFileRoute("/captar/$slug")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("lead_sources_public")
      .select(
        "id, name, slug, landing_headline, landing_subheadline, landing_description, landing_cta_label, landing_logo_url, landing_hero_image_url, landing_bg_color, landing_accent_color, landing_benefits, landing_testimonials, landing_form_fields, landing_success_message, landing_redirect_url, pixel_meta_id, gtag_id",
      )
      .eq("slug", params.slug)
      .maybeSingle();
    if (error || !data) throw notFound();
    return { config: data as unknown as LandingConfig };
  },
  head: ({ loaderData }) => {
    const c = loaderData?.config;
    const title = c ? `${c.landing_headline || c.name} — Kasa` : "Kasa";
    const desc = c?.landing_subheadline || c?.landing_description || "Fale com a Kasa.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...(c?.landing_hero_image_url ? [{ property: "og:image", content: c.landing_hero_image_url }] : []),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-background text-center px-6">
      <div className="max-w-md">
        <h1 className="font-display text-4xl font-bold mb-2">Página não encontrada</h1>
        <p className="text-foreground/60">Essa campanha pode ter sido encerrada ou o link está incorreto.</p>
      </div>
    </div>
  ),
  errorComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-background text-center px-6">
      <div className="max-w-md">
        <h1 className="font-display text-3xl font-bold mb-2">Algo deu errado</h1>
        <p className="text-foreground/60">Tente novamente em instantes.</p>
      </div>
    </div>
  ),
  component: CaptarPage,
});

function CaptarPage() {
  const { config } = Route.useLoaderData();
  const fields = (config.landing_form_fields?.length ? config.landing_form_fields : ["name", "email", "phone", "message"]) as string[];

  const [form, setForm] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inject tracking pixels
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (config.pixel_meta_id) {
      const s = document.createElement("script");
      s.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${config.pixel_meta_id}');fbq('track','PageView');`;
      document.head.appendChild(s);
    }
    if (config.gtag_id) {
      const s1 = document.createElement("script");
      s1.async = true;
      s1.src = `https://www.googletagmanager.com/gtag/js?id=${config.gtag_id}`;
      document.head.appendChild(s1);
      const s2 = document.createElement("script");
      s2.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${config.gtag_id}');`;
      document.head.appendChild(s2);
    }
  }, [config.pixel_meta_id, config.gtag_id]);

  const bg = config.landing_bg_color || "hsl(var(--background))";
  const accent = config.landing_accent_color || "hsl(var(--primary))";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name?.trim()) {
      setError("Por favor, informe seu nome.");
      return;
    }
    if (fields.includes("email") && !form.email?.trim() && fields.includes("phone") && !form.phone?.trim()) {
      setError("Informe ao menos e-mail ou telefone.");
      return;
    }

    setSubmitting(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const payload: Record<string, string> = {
        name: form.name?.trim() || "",
        email: form.email?.trim() || "",
        phone: form.phone?.trim() || "",
        company: form.company?.trim() || "",
        message: form.message?.trim() || "",
        budget: form.budget?.trim() || "",
        utm_source: params.get("utm_source") || "",
        utm_medium: params.get("utm_medium") || "",
        utm_campaign: params.get("utm_campaign") || "",
        utm_content: params.get("utm_content") || "",
        utm_term: params.get("utm_term") || "",
        referrer: document.referrer || "",
        landing_page_url: window.location.href,
      };

      const res = await fetch(`/api/public/leads/submit/${config.slug}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.details ? "Erro de validação. Verifique os campos." : "Não foi possível enviar. Tente novamente.");
        setSubmitting(false);
        return;
      }

      // tracking
      try {
        (window as any).fbq?.("track", "Lead");
        (window as any).gtag?.("event", "generate_lead");
      } catch {}

      if (json.redirect_url) {
        window.location.href = json.redirect_url;
        return;
      }
      setDone(true);
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: bg }}>
        <div className="max-w-lg text-center bg-card border border-border rounded-2xl p-10 shadow-xl">
          <div className="size-16 mx-auto rounded-full flex items-center justify-center mb-6" style={{ background: `${accent}20` }}>
            <CheckCircle2 className="size-9" style={{ color: accent }} />
          </div>
          <h1 className="font-display text-3xl font-bold mb-3">Recebido!</h1>
          <p className="text-foreground/70 leading-relaxed">
            {config.landing_success_message ||
              "Obrigado! Recebemos seu contato e em breve um especialista da Kasa vai falar com você."}
          </p>
        </div>
      </div>
    );
  }

  const setF = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="min-h-screen" style={{ background: bg }}>
      {/* Hero + form */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{ background: `radial-gradient(circle at 70% 20%, ${accent}40, transparent 60%)` }}
        />
        <div className="relative max-w-6xl mx-auto px-6 py-12 lg:py-20 grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: pitch */}
          <div>
            {config.landing_logo_url ? (
              <StorageImage src={config.landing_logo_url} alt={config.name} className="h-12 mb-8 object-contain" />
            ) : (
              <div className="font-display text-3xl font-black tracking-tighter mb-8" style={{ color: accent }}>
                kasa.
              </div>
            )}

            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-mono uppercase tracking-widest mb-6"
              style={{ borderColor: `${accent}40`, color: accent, background: `${accent}10` }}
            >
              <Sparkles className="size-3" />
              {config.name}
            </div>

            <h1 className="font-display text-4xl lg:text-6xl font-bold leading-[1.05] tracking-tight mb-5">
              {config.landing_headline || "Vamos construir algo grande juntos."}
            </h1>
            {config.landing_subheadline && (
              <p className="text-xl text-foreground/70 leading-relaxed mb-6">{config.landing_subheadline}</p>
            )}
            {config.landing_description && (
              <p className="text-foreground/60 leading-relaxed mb-8">{config.landing_description}</p>
            )}

            {config.landing_benefits?.length > 0 && (
              <ul className="space-y-3">
                {config.landing_benefits.map((b: { title: string; description?: string }, i: number) => (
                  <li key={i} className="flex items-start gap-3">
                    <div
                      className="size-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `${accent}20`, color: accent }}
                    >
                      <CheckCircle2 className="size-4" />
                    </div>
                    <div>
                      <span className="font-semibold">{b.title}</span>
                      {b.description && (
                        <span className="text-foreground/60"> — {b.description}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right: form */}
          <div className="bg-card border border-border rounded-2xl p-6 lg:p-8 shadow-2xl">
            <h2 className="font-display text-2xl font-bold mb-1">Fale com a gente</h2>
            <p className="text-sm text-foreground/60 mb-6">Respondemos em até 24h úteis.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {fields.includes("name") && (
                <Field label="Nome completo *" required>
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    value={form.name || ""}
                    onChange={(e) => setF("name", e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2"
                    style={{ ["--tw-ring-color" as any]: accent }}
                  />
                </Field>
              )}
              {fields.includes("email") && (
                <Field label="E-mail">
                  <input
                    type="email"
                    autoComplete="email"
                    value={form.email || ""}
                    onChange={(e) => setF("email", e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2"
                    style={{ ["--tw-ring-color" as any]: accent }}
                  />
                </Field>
              )}
              {fields.includes("phone") && (
                <Field label="WhatsApp / Telefone">
                  <input
                    type="tel"
                    autoComplete="tel"
                    placeholder="(00) 00000-0000"
                    value={form.phone || ""}
                    onChange={(e) => setF("phone", e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2"
                    style={{ ["--tw-ring-color" as any]: accent }}
                  />
                </Field>
              )}
              {fields.includes("company") && (
                <Field label="Empresa">
                  <input
                    type="text"
                    autoComplete="organization"
                    value={form.company || ""}
                    onChange={(e) => setF("company", e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2"
                    style={{ ["--tw-ring-color" as any]: accent }}
                  />
                </Field>
              )}
              {fields.includes("budget") && (
                <Field label="Investimento previsto">
                  <select
                    value={form.budget || ""}
                    onChange={(e) => setF("budget", e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2"
                    style={{ ["--tw-ring-color" as any]: accent }}
                  >
                    <option value="">Selecione…</option>
                    <option value="ate-5k">Até R$ 5.000</option>
                    <option value="5-15k">R$ 5.000 – R$ 15.000</option>
                    <option value="15-50k">R$ 15.000 – R$ 50.000</option>
                    <option value="acima-50k">Acima de R$ 50.000</option>
                  </select>
                </Field>
              )}
              {fields.includes("message") && (
                <Field label="Como podemos ajudar?">
                  <textarea
                    rows={4}
                    value={form.message || ""}
                    onChange={(e) => setF("message", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 resize-none"
                    style={{ ["--tw-ring-color" as any]: accent }}
                  />
                </Field>
              )}

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-lg font-semibold text-base flex items-center justify-center gap-2 transition-opacity disabled:opacity-50 shadow-lg"
                style={{ background: accent, color: "#000" }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Enviando…
                  </>
                ) : (
                  <>
                    {config.landing_cta_label || "Quero falar com a Kasa"}
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>

              <p className="text-[11px] text-foreground/40 text-center">
                Seus dados estão seguros. Não enviamos spam.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {config.landing_testimonials?.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-12 lg:py-16 border-t border-border/40">
          <h3 className="text-center text-[11px] font-mono uppercase tracking-widest text-foreground/40 mb-8">
            Quem confia na Kasa
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {config.landing_testimonials.map((t: { author: string; text: string; role?: string }, i: number) => (
              <div key={i} className="bg-card border border-border rounded-xl p-6">
                <p className="text-foreground/80 italic leading-relaxed mb-4">"{t.text}"</p>
                <div className="text-sm">
                  <div className="font-semibold">{t.author}</div>
                  {t.role && <div className="text-foreground/50 text-xs">{t.role}</div>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="text-center py-8 text-xs text-foreground/30 font-mono uppercase tracking-widest">
        © {new Date().getFullYear()} Kasa
      </footer>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wider text-foreground/60 mb-1.5">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}
