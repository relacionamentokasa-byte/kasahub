import { useLayoutEffect, useRef, useState } from "react";
import type { Slide } from "./types";
import { SlideView } from "./SlideView";

/** Renders a 1920x1080 slide scaled into its parent container. */
export function ScaledSlide({
  slide,
  brandColor,
  clientLogoUrl,
  clientName,
  pageNumber,
  totalPages,
  background = "#0a0a0a",
  className = "",
}: {
  slide: Slide;
  brandColor?: string;
  clientLogoUrl?: string | null;
  clientName?: string;
  pageNumber?: number;
  totalPages?: number;
  background?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const updateScale = () => {
      const box = el.getBoundingClientRect();
      if (box.width <= 0 || box.height <= 0) return;
      setScale(Math.min(box.width / 1920, box.height / 1080, 1));
    };

    updateScale();
    const frame = requestAnimationFrame(updateScale);
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    window.addEventListener("resize", updateScale);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, []);

  return (
    <div ref={ref} className={`relative w-full h-full overflow-hidden ${className}`} style={{ background }}>
      <div
        className="absolute"
        style={{
          width: 1920,
          height: 1080,
          left: "50%",
          top: "50%",
          marginLeft: -960,
          marginTop: -540,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
        }}
      >
        <SlideView
          slide={slide}
          brandColor={brandColor}
          clientLogoUrl={clientLogoUrl}
          clientName={clientName}
          pageNumber={pageNumber}
          totalPages={totalPages}
        />
      </div>
    </div>
  );
}
