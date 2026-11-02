"use client";

import { useCallback, useRef, useState } from "react";
import { Move, X, ZoomIn } from "lucide-react";
import { cn } from "@/lib/cn";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { WishlistButton } from "@/components/wishlist/wishlist-button";

export interface GalleryImage {
  id: string | number;
  url: string;
  alt: string | null;
  position: number;
}

const ZOOM_SCALE = "scale(1.45)";

export function ProductMediaGallery({
  gallery,
  productId,
  productTitle,
  isBestseller,
}: {
  gallery: GalleryImage[];
  productId: string;
  productTitle: string;
  /** Only rendered when the catalogue actually flags the item. */
  isBestseller?: boolean;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const railRef = useRef<HTMLDivElement | null>(null);

  const select = useCallback(
    (idx: number) => {
      setActiveIdx(idx);
      setZoom(false);
    },
    [],
  );

  /** Left/right arrows move between thumbnails while focus is in the rail. */
  const handleThumbKeyDown = useCallback(
    (event: React.KeyboardEvent, idx: number) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const next =
        event.key === "ArrowRight"
          ? (idx + 1) % gallery.length
          : (idx - 1 + gallery.length) % gallery.length;
      select(next);
      railRef.current
        ?.querySelector<HTMLButtonElement>(`[data-thumb-index="${next}"]`)
        ?.focus();
    },
    [gallery.length, select],
  );
  if (!gallery.length) return null;

  const mainImage = gallery[activeIdx];
  if (!mainImage) return null;

  return (
    <div className="flex w-full flex-col-reverse gap-3 md:flex-row">
      {/* Thumbnail rail */}
      {gallery.length > 1 ? (
        <div
          ref={railRef}
          role="tablist"
          aria-label={`${productTitle} images`}
          className="flex shrink-0 gap-2 overflow-x-auto pb-2 md:flex-col md:overflow-y-auto md:pb-0"
        >
          {gallery.map((image, idx) => {
            const active = idx === activeIdx;
            return (
              <button
                key={image.id}
                type="button"
                role="tab"
                data-thumb-index={idx}
                aria-selected={active}
                aria-label={`View image ${idx + 1} of ${gallery.length}`}
                onClick={() => select(idx)}
                onKeyDown={(event) => handleThumbKeyDown(event, idx)}
                className={cn(
                  "relative size-16 shrink-0 overflow-hidden rounded-[var(--radius-tile)] border bg-[var(--glass-inset)] backdrop-blur-md transition-[border-color,opacity,transform] duration-[var(--dur-fast)] md:size-20",
                  active
                    ? "border-[var(--glass-ring)] opacity-100"
                    : "border-[var(--glass-line)] opacity-65 hover:opacity-100",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
                )}
              >
                <ImageWithFallback
                  src={image.url}
                  alt=""
                  className="size-full object-cover"
                />
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Stage */}
      <div
        className="glass-surface relative flex min-h-[22rem] flex-1 items-center justify-center overflow-hidden rounded-[var(--radius-panel)] sm:min-h-[28rem] lg:min-h-[34rem]"
        onMouseMove={(event) => {
          if (!zoom) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const x = ((event.clientX - rect.left) / rect.width) * 100;
          const y = ((event.clientY - rect.top) / rect.height) * 100;
          setOrigin(`${x}% ${y}%`);
        }}
      >
        {/* Real badges only — driven by the catalogue flag, not hardcoded. */}
        {(isBestseller || gallery.length > 1) && (
          <div className="pointer-events-none absolute left-4 top-4 z-10 flex flex-col items-start gap-1.5">
            {isBestseller ? (
              <span className="rounded-full border border-[var(--glass-line-strong)] bg-[var(--glass-tint-strong)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-foreground)] backdrop-blur-md">
                Bestseller
              </span>
            ) : null}
            {gallery.length > 1 ? (
              <span className="rounded-full border border-[var(--glass-line)] bg-[var(--glass-fill-strong)] px-2.5 py-1 text-[11px] font-medium tabular-nums text-[var(--color-foreground)] backdrop-blur-md">
                {activeIdx + 1} / {gallery.length}
              </span>
            ) : null}
          </div>
        )}

        <WishlistButton
          productId={productId}
          title={productTitle}
          size="lg"
          className="absolute right-4 top-4 z-10"
        />

        {/* Zoomable canvas */}
        <button
          type="button"
          aria-label={zoom ? "Zoom out of product image" : "Zoom in on product image"}
          aria-pressed={zoom}
          onClick={() => {
            setZoom((z) => !z);
            setOrigin("50% 50%");
          }}
          className={cn(
            "flex size-full cursor-crosshair items-center justify-center p-5 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--color-primary)] sm:p-7",
            zoom && "cursor-zoom-out",
          )}
        >
          <ImageWithFallback
            src={mainImage.url}
            alt={mainImage.alt ?? productTitle}
            loading={activeIdx === 0 ? "eager" : "lazy"}
            className="max-h-full max-w-full object-contain transition-transform duration-[var(--dur-slow)] ease-[var(--ease-spatial)] motion-reduce:transition-none"
            style={{
              transform: zoom ? ZOOM_SCALE : "scale(1)",
              transformOrigin: origin,
            }}
          />
        </button>

        {/* Hint pill */}
        <span className="pointer-events-none absolute bottom-4 right-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-line)] bg-[var(--glass-fill-strong)] px-3 py-1.5 text-[11px] font-medium text-[var(--color-foreground)] backdrop-blur-md">
          {zoom ? (
            <>
              <X aria-hidden className="size-3.5" />
              Tap to zoom out
            </>
          ) : (
            <>
              {gallery.length > 1 ? (
                <Move aria-hidden className="size-3.5" />
              ) : (
                <ZoomIn aria-hidden className="size-3.5" />
              )}
              Tap to inspect
            </>
          )}
        </span>
      </div>
    </div>
  );
}
