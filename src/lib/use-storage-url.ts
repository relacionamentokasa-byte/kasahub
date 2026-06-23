import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Cache global: URL pública -> signed URL (válida 7 dias)
const cache = new Map<string, { url: string; expires: number }>();
const inflight = new Map<string, Promise<string | null>>();

const SIGN_TTL_SEC = 60 * 60 * 24 * 7; // 7 dias
const CACHE_TTL_MS = (SIGN_TTL_SEC - 3600) * 1000; // renova 1h antes de expirar

/**
 * Parseia uma URL pública do Supabase Storage no formato
 *   https://<proj>.supabase.co/storage/v1/object/public/<bucket>/<path>
 * e retorna { bucket, path }. Retorna null se não bater.
 */
function parsePublicStorageUrl(url: string): { bucket: string; path: string } | null {
  if (!url) return null;
  const m = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+?)(?:\?|$)/);
  if (!m) return null;
  return { bucket: decodeURIComponent(m[1]), path: decodeURIComponent(m[2]) };
}

async function resolve(url: string): Promise<string | null> {
  const cached = cache.get(url);
  if (cached && cached.expires > Date.now()) return cached.url;
  if (inflight.has(url)) return inflight.get(url)!;

  const parsed = parsePublicStorageUrl(url);
  if (!parsed) return url; // não é storage público — usa direto

  const promise = (async () => {
    const { data, error } = await supabase.storage
      .from(parsed.bucket)
      .createSignedUrl(parsed.path, SIGN_TTL_SEC);
    if (error || !data?.signedUrl) {
      // fallback: retorna a URL original (vai falhar visualmente, mas não quebra)
      return url;
    }
    cache.set(url, { url: data.signedUrl, expires: Date.now() + CACHE_TTL_MS });
    return data.signedUrl;
  })();

  inflight.set(url, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(url);
  }
}

/**
 * Versão imperativa (fora de React) — útil para exportação de PDF, etc.
 */
export async function resolveStorageUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  return resolve(url);
}

/**
 * Resolve uma URL pública do Supabase Storage para uma signed URL
 * (necessário quando o bucket está privado).
 * Retorna a URL resolvida ou null enquanto carrega.
 */
export function useStorageUrl(url: string | null | undefined): string | null {
  const [resolved, setResolved] = useState<string | null>(() => {
    if (!url) return null;
    const c = cache.get(url);
    if (c && c.expires > Date.now()) return c.url;
    if (!parsePublicStorageUrl(url)) return url;
    return null;
  });

  useEffect(() => {
    if (!url) {
      setResolved(null);
      return;
    }
    let alive = true;
    resolve(url).then((u) => {
      if (alive) setResolved(u);
    });
    return () => {
      alive = false;
    };
  }, [url]);

  return resolved;
}
