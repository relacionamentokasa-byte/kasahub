/**
 * Neutraliza a extensão de navegador "FreeLovable" (não oficial).
 * A extensão intercepta o Enter e injeta toasts/overlays na página,
 * além de enviar conteúdo para api.freelovable.com.br.
 *
 * Como rodamos em isolated world, não conseguimos desinstalar a extensão,
 * mas podemos:
 * Bloqueia requisições para o domínio da extensão via fetch/XHR wrappers.
 * Não altera o DOM: remover nós fora do ciclo do React pode corromper a árvore
 * renderizada e causar uma tela em branco durante a reconciliação.
 */
export function installFreeLovableBlocker() {
  if (typeof window === "undefined") return;
  if ((window as any).__kasaFreeLovableBlocked) return;
  (window as any).__kasaFreeLovableBlocked = true;

  const BAD_HOSTS = ["freelovable.com.br", "freelovable.com"];
  // Bloqueia requisições da extensão sem interferir nos elementos do React.
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
