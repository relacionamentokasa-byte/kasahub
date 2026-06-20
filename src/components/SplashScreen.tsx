import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BRAND_PHRASES = [
  "Humanidade Antes da Meta.",
  "Somos muitos. Mas falamos em uma só voz.",
  "Conectando pessoas, gerando resultado.",
  "Cada lead, uma história.",
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function firstName(full?: string | null) {
  if (!full) return null;
  return full.trim().split(/\s+/)[0];
}

interface SplashScreenProps {
  userId: string;
  onDone: () => void;
}

const TOTAL_MS = 6500;

export function SplashScreen({ userId, onDone }: SplashScreenProps) {
  const [name, setName] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [out, setOut] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase
      .from("profiles")
      .select("display_name, full_name")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        setName(firstName((data as any)?.display_name || (data as any)?.full_name));
      });
    return () => {
      alive = false;
    };
  }, [userId]);

  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const total = reduced ? 800 : TOTAL_MS;

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / total);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const phraseTimer = setInterval(() => {
      setPhraseIdx((i) => (i + 1) % BRAND_PHRASES.length);
    }, 1400);

    const endTimer = setTimeout(() => setOut(true), total);
    const doneTimer = setTimeout(() => onDoneRef.current(), total + 500);

    const skip = () => {
      setOut(true);
      setTimeout(() => onDoneRef.current(), 300);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") skip();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", skip);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(phraseTimer);
      clearTimeout(endTimer);
      clearTimeout(doneTimer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", skip);
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-500 ${
        out ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        backgroundColor: "#FFBC45",
        backgroundImage:
          "radial-gradient(circle at 50% 40%, rgba(0,0,0,0.08) 0%, transparent 60%)",
        }}
      >
        {/* subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,0,0,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

      <div className="relative flex flex-col items-center gap-12 px-6 text-center w-full max-w-xl">
        {/* Logo */}
        <img
          src="https://api.freelovable.com.br/storage/v1/object/public/anexos/754fd88b-89a4-425f-a86f-f4ed2fe6a542.png"
          alt="Kasa"
          className="animate-[splash-logo_900ms_ease-out_both] w-auto h-auto object-contain"
          style={{ maxWidth: "min(60vw, 22rem)", maxHeight: "32vh" }}
        />

        {/* Saudação */}
        <p className="font-display text-xl md:text-2xl font-light text-black/85 tracking-tight animate-[splash-fade_700ms_ease-out_300ms_both]">
          {greeting()}
          {name ? (
            <>
              , <span className="font-semibold text-black">{name}</span>
            </>
          ) : null}
          .
        </p>

        {/* Progress bar */}
        <div className="w-full max-w-sm flex flex-col items-center gap-4 animate-[splash-fade_700ms_ease-out_500ms_both]">
          <div className="relative w-full h-[3px] rounded-full overflow-hidden bg-black/15">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-100 ease-linear"
              style={{
                width: `${progress * 100}%`,
                background:
                  "linear-gradient(90deg, rgba(0,0,0,0.5), #000000)",
                boxShadow: "0 0 12px rgba(0,0,0,0.25)",
              }}
            />
          </div>

          {/* Rotating phrase */}
          <div className="h-5 flex items-center justify-center overflow-hidden">
            <p
              key={phraseIdx}
              className="font-mono-kasa text-[11px] md:text-xs uppercase tracking-[0.32em] text-black/60 animate-[splash-phrase_600ms_ease-out_both]"
            >
              {BRAND_PHRASES[phraseIdx]}
            </p>
          </div>
        </div>
      </div>

      {/* Skip hint */}
      <div
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.25em] text-white/30 transition-opacity duration-500 ${
          out ? "opacity-0" : "opacity-100"
        }`}
      >
        pressione qualquer tecla para entrar
      </div>

      <style>{`
        @keyframes splash-logo {
          0% { opacity: 0; transform: scale(0.94) translateY(8px); filter: blur(8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
        }
        @keyframes splash-fade {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes splash-phrase {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
