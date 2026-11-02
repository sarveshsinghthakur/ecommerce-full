"use client";

import {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

export type RevealVariant =
  | "up"
  | "down"
  | "left"
  | "right"
  | "blur"
  | "image"
  | "scale";

interface RevealProps {
  children: ReactNode;
  /** Motion preset applied while hidden; all resolve to a resting state. */
  variant?: RevealVariant;
  /** Stagger offset in ms (pair with `index * stagger` when mapping lists). */
  delay?: number;
  className?: string;
  /** Element type to render (default `div`). */
  as?: ElementType;
  /** Re-trigger every time the element re-enters the viewport (default false). */
  repeat?: boolean;
  id?: string;
}

/**
 * Scroll-reveal wrapper: adds `.is-visible` once the element enters the
 * viewport, letting the CSS in globals.css animate opacity/blur/transform.
 *
 * Graceful fallbacks: without IntersectionObserver (or with reduced motion
 * preference) the element is shown immediately so nothing stays hidden.
 */
export function Reveal({
  children,
  variant = "up",
  delay = 0,
  className,
  as: Tag = "div",
  repeat = false,
  id,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            if (!repeat) observer.unobserve(entry.target);
          } else if (repeat) {
            setVisible(false);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -48px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [repeat]);

  return (
    <Tag
      id={id}
      ref={ref}
      data-reveal={variant}
      style={delay ? { "--reveal-delay": `${delay}ms` } as React.CSSProperties : undefined}
      className={cn(visible && "is-visible", className)}
    >
      {children}
    </Tag>
  );
}

interface StaggerProps {
  children: React.ReactNode;
  /** Delay between each child, ms. */
  step?: number;
  /** Delay before the first child, ms. */
  delay?: number;
  variant?: RevealVariant;
  className?: string;
  /** Classes applied to every per-child wrapper (e.g. `h-full` in grids). */
  itemClassName?: string;
  as?: ElementType;
}

/**
 * Wraps each direct child in a <Reveal/> with an incrementing delay so a grid
 * or list animates in sequence (80ms apart by default).
 */
export function Stagger({
  children,
  step = 80,
  delay = 0,
  variant = "up",
  className,
  itemClassName,
  as: Tag = "div",
}: StaggerProps) {
  const items = Array.isArray(children) ? children : [children];
  return (
    <Tag className={className}>
      {items.map((child, index) => (
        <Reveal
          key={index}
          variant={variant}
          delay={delay + index * step}
          className={itemClassName}
        >
          {child}
        </Reveal>
      ))}
    </Tag>
  );
}
