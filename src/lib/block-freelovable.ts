/**
 * Neutraliza a extensão de navegador "FreeLovable" (não oficial).
 * A extensão intercepta o Enter e injeta toasts/overlays na página,
 * além de enviar conteúdo para api.freelovable.com.br.
 *
 * Como rodamos em isolated world, não conseguimos desinstalar a extensão,
 * mas podemos:
 *  1. Remover do DOM qualquer toast/overlay que ela injeta.
 *  2. Bloquear requisições para o domínio dela via fetch/XHR wrappers.
 */
export function installFreeLovableBlocker() {
  if (typeof window === "undefined") return;
  if ((window as any).__kasaFreeLovableBlocked) return;
  (window as any).__kasaFreeLovableBlocked = true;

  const BAD_HOSTS = ["freelovable.com.br", "freelovable.com"];
  const BAD_TEXT = /free\s*lovable|enviado\s+via\s+free/i;

  // 1) Remove nós com texto da extensão
  const scrub = (root: ParentNode) => {
    const nodes = root.querySelectorAll<HTMLElement>(
      "div,section,aside,span,p,article,dialog",
    );
    nodes.forEach((el) => {
      if (el.childElementCount > 8) return; // evita varrer árvores grandes
      const txt = el.textContent || "";
      if (txt.length < 200 && BAD_TEXT.test(txt)) {
        el.remove();
      }
    });
  };

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((n) => {
        if (n.nodeType === 1) {
          const el = n as HTMLElement;
          if (BAD_TEXT.test(el.textContent || "") && (el.textContent || "").length < 200) {
            el.remove();
            return;
          }
          scrub(el);
        }
      });
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // 2) Bloqueia requisições da extensão
  const isBadUrl = (u: string) => BAD_HOSTS.some((h) => u.includes(h));

  const origFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url;
    if (url && isBadUrl(url)) {
      return Promise.resolve(new Response("", { status: 204 }));
    }
    return origFetch(input as any, init);
  }) as typeof fetch;

  const OrigXHROpen = XMLHttpRequest.prototype.open;
  (XMLHttpRequest.prototype as any).open = function (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    async?: boolean,
    user?: string | null,
    password?: string | null,
  ) {
    if (typeof url === "string" && isBadUrl(url)) {
      return (OrigXHROpen as any).call(this, method, "about:blank", async ?? true, user, password);
    }
    return (OrigXHROpen as any).call(this, method, url, async ?? true, user, password);
  };
}
