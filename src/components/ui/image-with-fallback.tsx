"use client";

import { useState } from "react";

const DEFAULT_FALLBACK = "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80";

export interface ImageWithFallbackProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
}

export function ImageWithFallback({
  src,
  alt = "Product image",
  fallbackSrc = DEFAULT_FALLBACK,
  className = "",
  ...props
}: ImageWithFallbackProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const finalSrc = error || !src ? fallbackSrc : src;

  return (
    <div className="relative size-full overflow-hidden bg-[var(--color-muted)]">
      {!loaded && (
        <div className="absolute inset-0 skeleton" aria-hidden="true" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={finalSrc}
        alt={alt}
        onError={() => setError(true)}
        onLoad={() => setLoaded(true)}
        referrerPolicy="no-referrer"
        className={`${className} ${loaded ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}
        {...props}
      />
    </div>
  );
}
