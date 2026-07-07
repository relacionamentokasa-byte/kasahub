/**
 * Service Worker registration wrapper.
 * Guarded so it never registers in dev, Lovable preview, iframe, or when ?sw=off is present.
 * If any guard fails, also unregister any existing /sw.js registration to clean stale workers.
 */
export function registerPWA() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

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
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => {
        const swUrl = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
        if (swUrl.endsWith("/sw.js")) r.unregister().catch(() => {});
      });
    }).catch(() => {});
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => console.warn("[PWA] SW registration failed:", err));
  });
}
