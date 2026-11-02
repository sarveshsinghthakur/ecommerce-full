"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

interface CounterProps {
  /** Target value. */
  to: number;
  /** Decimal places to display. */
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** Animation duration in ms. */
  duration?: number;
  /** Start the animation only when scrolled into view (default true). */
  inView?: boolean;
  className?: string;
}

function format(value: number, decimals: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Count-up number that starts when it scrolls into view, easing out the last
 * stretch so the final value "settles" the way the reference design does.
 * Renders the final value in SSR so there is no layout shift or hidden text.
 */
export function Counter({
  to,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1400,
  inView = true,
  className,
}: CounterProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(() => format(to, decimals));
  const started = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const run = () => {
      if (started.current) return;
      started.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(format(to * eased, decimals));
        if (progress < 1) requestAnimationFrame(tick);
        else setDisplay(format(to, decimals));
      };
      requestAnimationFrame(tick);
    };

    if (!inView || typeof IntersectionObserver === "undefined") {
      run();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          run();
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [to, decimals, duration, inView]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
