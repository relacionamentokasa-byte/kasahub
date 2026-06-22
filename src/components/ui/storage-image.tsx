import { forwardRef, ImgHTMLAttributes } from "react";
import { useStorageUrl } from "@/lib/use-storage-url";

export interface StorageImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string | null;
  fallback?: string;
}

/**
 * <img> que resolve URLs públicas do Supabase Storage para signed URLs
 * automaticamente (necessário quando o bucket é privado).
 */
export const StorageImage = forwardRef<HTMLImageElement, StorageImageProps>(
  ({ src, fallback, alt = "", ...rest }, ref) => {
    const resolved = useStorageUrl(src);
    const final = resolved || fallback || "";
    if (!final) return null;
    return <img ref={ref} src={final} alt={alt} {...rest} />;
  }
);
StorageImage.displayName = "StorageImage";
