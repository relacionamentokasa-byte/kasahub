import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const YELLOW_LOGO =
  "https://fduofhsiahyxvlaxthhe.supabase.co/storage/v1/object/public/logos/logo-yellow.png";

const BRAND_PHRASES = [
  "Antes da meta, humanidade.",
  "Somos muitos. Mais falamos em uma só voz.",
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

export function SplashScreen({ userId, onDone }: SplashScreenProps) {
  const [name, setName] = useState<string | null>(null);
  const [phase, setPhase] = useState<"logo" | "greet" | "phrase" | "out">("logo");

  // Pega nome do perfil
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

  // Sequência de animação
  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const speed = reduced ? 0.4 : 1;
    const t1 = setTimeout(() => setPhase("greet"), 900 * speed);
    const t2 = setTimeout(() => setPhase("phrase"), 1900 * speed);
    const t3 = setTimeout(() => setPhase("out"), 3400 * speed);
    const t4 = setTimeout(() => onDone(), 3900 * speed);

    const skip = () => {
      setPhase("out");
      setTimeout(onDone, 350);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") skip();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", skip);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", skip);
    };
  }, [onDone]);

  const phrase = BRAND_PHRASES[Math.floor(Math.random() * BRAND_PHRASES.length)];

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-background transition-opacity duration-500 ${
        phase === "out" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        background:
          "radial-gradient(circle at 50% 40%, hsl(var(--primary) / 0.08) 0%, hsl(var(--background)) 60%)",
      }}
    >
      <div className="flex flex-col items-center gap-8 px-6 text-center max-w-xl">
        {/* Logo */}
        <img
          src={YELLOW_LOGO}
          alt="Kasa"
          className="h-20 w-auto object-contain animate-[splash-logo_900ms_ease-out_both]"
        />

        {/* Saudação */}
        <div
          className={`min-h-[2.5rem] transition-all duration-500 ${
            phase === "logo" ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
          }`}
        >
          <p className="font-display text-2xl md:text-3xl font-medium text-foreground tracking-tight">
            {greeting()}
            {name ? (
              <>
                , <span className="text-primary">{name}</span>
              </>
            ) : null}
            .
          </p>
        </div>

        {/* Frase de branding */}
        <div
          className={`transition-all duration-700 ${
            phase === "logo" || phase === "greet"
              ? "opacity-0 translate-y-2"
              : "opacity-100 translate-y-0"
          }`}
        >
          <p className="font-mono-kasa text-xs md:text-sm uppercase tracking-[0.25em] text-foreground/50">
            {phrase}
          </p>
        </div>
      </div>

      {/* Skip hint */}
      <div
        className={`absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.2em] text-foreground/30 transition-opacity duration-500 ${
          phase === "out" ? "opacity-0" : "opacity-100"
        }`}
      >
        pressione qualquer tecla para entrar
      </div>

      <style>{`
        @keyframes splash-logo {
          0% { opacity: 0; transform: scale(0.92); filter: blur(6px); }
          100% { opacity: 1; transform: scale(1); filter: blur(0); }
        }
      `}</style>
    </div>
  );
}
