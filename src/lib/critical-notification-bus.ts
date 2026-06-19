// Event bus + queue para popups críticos (mention, critical, approval)

export type CriticalNotif = {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  link: string | null;
};

type Listener = (queue: CriticalNotif[]) => void;

let queue: CriticalNotif[] = [];
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l([...queue]));
}

export const criticalBus = {
  push(n: CriticalNotif) {
    if (queue.find((q) => q.id === n.id)) return;
    queue.push(n);
    emit();
  },
  shift() {
    queue.shift();
    emit();
  },
  clear() {
    queue = [];
    emit();
  },
  subscribe(l: Listener) {
    listeners.add(l);
    l([...queue]);
    return () => listeners.delete(l);
  },
};

// --- Tab title flash ---
let originalTitle: string | null = null;
let flashInterval: ReturnType<typeof setInterval> | null = null;

export function startTitleFlash(message: string) {
  if (typeof document === "undefined") return;
  if (originalTitle === null) originalTitle = document.title;
  stopTitleFlash(false);
  let toggle = false;
  flashInterval = setInterval(() => {
    document.title = toggle ? originalTitle! : message;
    toggle = !toggle;
  }, 1000);
}

export function stopTitleFlash(restore = true) {
  if (flashInterval) {
    clearInterval(flashInterval);
    flashInterval = null;
  }
  if (restore && originalTitle !== null) {
    document.title = originalTitle;
    originalTitle = null;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("focus", () => stopTitleFlash());
}

// --- Som mais marcante (Web Audio: dois bips agudos) ---
export function playCriticalSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const beep = (start: number, freq: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.35, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    };

    beep(now, 880);
    beep(now + 0.18, 1175);
    beep(now + 0.36, 1568);

    setTimeout(() => ctx.close().catch(() => {}), 1000);
  } catch {
    /* ignore */
  }
}
