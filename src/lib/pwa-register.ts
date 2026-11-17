/**
 * Service Worker registration wrapper.
 * Guarded so it never registers in dev, Lovable preview, iframe, or when ?sw=off is present.
 * If any guard fails, also unregister any existing /sw.js registration to clean stale workers.
 */
let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export function registerPWA(): Promise<ServiceWorkerRegistration | null> {
  if (registrationPromise) return registrationPromise;
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(null);
  }

  registrationPromise = (async () => {
    const url = new URL(window.location.href);
    const host = window.location.hostname;
    const inIframe = window.self !== window.top;

    const isLovablePreview =
      host.startsWith("id-preview--") ||
      host.startsWith("preview--") ||
      host === "lovableproject.com" ||
      host.endsWith(".lovableproject.com") ||
      host === "lovableproject-dev.com" ||
      host.endsWith(".lovableproject-dev.com") ||
      host === "beta.lovable.dev" ||
      host.endsWith(".beta.lovable.dev");

    const killSwitch = url.searchParams.get("sw") === "off";
    const refuse = !import.meta.env.PROD || inIframe || isLovablePreview || killSwitch;

    if (refuse) {
      await navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => {
          const swUrl = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
          if (swUrl.endsWith("/sw.js")) r.unregister().catch(() => {});
        });
      }).catch(() => {});
      return null;
    }

    try {
      const register = () => navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const registration = document.readyState === "complete"
        ? await register()
        : await new Promise<ServiceWorkerRegistration>((resolve, reject) => {
            window.addEventListener("load", () => register().then(resolve, reject), { once: true });
          });
      return await navigator.serviceWorker.ready.then(() => registration);
    } catch (err) {
      console.warn("[PWA] SW registration failed:", err);
      throw err;
    }
  })();

  return registrationPromise;
}

export function getPWARegistrationPromise() {
  return registrationPromise ?? registerPWA();
}

export async function getReadyPWARegistration(): Promise<ServiceWorkerRegistration> {
  const registration = await getPWARegistrationPromise();
  if (!registration) throw new Error("Service Worker não disponível neste ambiente");
  return navigator.serviceWorker.ready;
}
