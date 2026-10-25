"use client";

import { useEffect, useState } from "react";

const DEFAULT_FALLBACK = "/images/product-placeholder.svg";

export interface ImageWithFallbackProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
}

export function ImageWithFallback({
  src,
  alt = "Product image",
  fallbackSrc = DEFAULT_FALLBACK,
  className = "",
  onError,
  onLoad,
  ...props
}: ImageWithFallbackProps) {
  // Reset all failure state whenever the requested source changes so a new
  // (or retried) image is allowed to load again.
  const [failed, setFailed] = useState(false);
  const [placeholderFailed, setPlaceholderFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFailed(false);
    setPlaceholderFailed(false);
    setLoaded(false);
  }, [src, fallbackSrc]);

  const hasSource = Boolean(src);
  // When the original source is missing or has failed we try the fallback.
  const useFallback = !hasSource || failed;
  const currentSrc = useFallback
    ? placeholderFailed
      ? undefined
      : fallbackSrc
    : src;

  const handleError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (useFallback) {
      setPlaceholderFailed(true);
    } else {
      setFailed(true);
      setLoaded(false);
    }
    setLoaded(true);
    onError?.(event as unknown as React.SyntheticEvent<HTMLImageElement>);
  };

  const handleLoad = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setLoaded(true);
    onLoad?.(event as unknown as React.SyntheticEvent<HTMLImageElement>);
  };

  return (
    <div className="relative size-full overflow-hidden bg-[var(--color-muted)]">
      {!loaded && (
        <div className="absolute inset-0 skeleton" aria-hidden="true" />
      )}
      {currentSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentSrc}
          alt={alt}
          onError={handleError}
          onLoad={handleLoad}
          referrerPolicy="no-referrer"
          className={`${className} ${loaded ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}
          {...props}
        />
      ) : (
        <div className="flex size-full items-center justify-center px-4 text-center text-xs font-medium text-[var(--color-muted-foreground)]">
          Image unavailable
        </div>
      )}
      {placeholderFailed && (
        <span className="sr-only">Image unavailable</span>
      )}
    </div>
  );
}
