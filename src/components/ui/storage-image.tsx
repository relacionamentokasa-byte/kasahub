import { forwardRef, ImgHTMLAttributes, useState, useEffect } from "react";
import { useStorageUrl } from "@/lib/use-storage-url";

export interface StorageImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string | null;
  fallback?: string;
}

/**
 * <img> que resolve URLs públicas do Supabase Storage para signed URLs
 * automaticamente (necessário quando o bucket é privado), com tratamento de erro de carregamento.
 */
export const StorageImage = forwardRef<HTMLImageElement, StorageImageProps>(
  ({ src, fallback, alt = "", onError, className, ...rest }, ref) => {
    const resolved = useStorageUrl(src);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
      setHasError(false);
    }, [src, resolved]);

    const final = (!hasError && resolved) || fallback || "";
    if (!final) return null;

    return (
      <img
        ref={ref}
        src={final}
        alt={alt}
        className={className}
        onError={(e) => {
          setHasError(true);
          onError?.(e);
        }}
        {...rest}
      />
    );
  }
);
StorageImage.displayName = "StorageImage";
