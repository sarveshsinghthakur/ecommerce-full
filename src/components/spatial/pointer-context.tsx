"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

/* -------------------------------------------------------------------------- */
/* prefers-reduced-motion                                                      */
/* -------------------------------------------------------------------------- */

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(onChange: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

function getMotionSnapshot() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

function getServerMotionSnapshot() {
  return false;
}

/**
 * True when the visitor has asked the OS for reduced motion.
 *
 * Hydration-safe: renders `false` on the server and on the first client paint,
 * then settles to the real value, so server markup always matches.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToMotionPreference,
    getMotionSnapshot,
    getServerMotionSnapshot,
  );
}

/* -------------------------------------------------------------------------- */
/* Capability probe                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Whether the visitor is on a device with a fine, hover-capable pointer.
 * Spatial tilt and pointer parallax are switched off on touch so nothing
 * drifts under a thumb or traps scroll performance.
 */
export function useHasFinePointer(): boolean {
  const [fine, setFine] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const list = window.matchMedia("(hover: hover) and (pointer: fine)");
    const apply = () => setFine(list.matches);
    apply();
    list.addEventListener("change", apply);
    return () => list.removeEventListener("change", apply);
  }, []);

  return fine;
}

/* -------------------------------------------------------------------------- */
/* Global pointer position                                                     */
/* -------------------------------------------------------------------------- */

interface PointerValue {
  /** Normalised -1..1 across the viewport. */
  x: number;
  y: number;
  /** False on touch devices and for reduced-motion visitors. */
  active: boolean;
}

const INACTIVE: PointerValue = { x: 0, y: 0, active: false };

const PointerContext = createContext<PointerValue>(INACTIVE);

/**
 * Publishes the normalised pointer position as `--px` / `--py` on
 * `<html>`, and through context for anything that needs the raw numbers.
 *
 * The custom properties are what actually drive the parallax utilities in
 * globals.css, so one throttled listener can move every layer on the page
 * without re-rendering a single component.
 *
 * Mount once, near the root of the storefront.
 */
export function PointerProvider({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const fine = useHasFinePointer();
  const [value, setValue] = useState<PointerValue>(INACTIVE);

  useEffect(() => {
    if (!fine || reduced) {
      document.documentElement.style.removeProperty("--px");
      document.documentElement.style.removeProperty("--py");
      setValue(INACTIVE);
      return;
    }

    let frame = 0;
    let nextX = 0;
    let nextY = 0;

    const flush = () => {
      frame = 0;
      const root = document.documentElement;
      root.style.setProperty("--px", nextX.toFixed(4));
      root.style.setProperty("--py", nextY.toFixed(4));
      setValue((prev) =>
        prev.x === nextX && prev.y === nextY
          ? prev
          : { x: nextX, y: nextY, active: true },
      );
    };

    const onMove = (event: PointerEvent) => {
      nextX = (event.clientX / window.innerWidth) * 2 - 1;
      nextY = (event.clientY / window.innerHeight) * 2 - 1;
      if (!frame) frame = window.requestAnimationFrame(flush);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) window.cancelAnimationFrame(frame);
      document.documentElement.style.removeProperty("--px");
      document.documentElement.style.removeProperty("--py");
    };
  }, [fine, reduced]);

  return (
    <PointerContext.Provider value={value}>{children}</PointerContext.Provider>
  );
}

export function usePointerPosition(): PointerValue {
  return useContext(PointerContext);
}

/* -------------------------------------------------------------------------- */
/* Local tilt                                                                  */
/* -------------------------------------------------------------------------- */

export interface TiltOptions {
  /** Maximum rotation in degrees. Keep small — this is depth, not a gimmick. */
  max?: number;
  /** Pixel lift applied on hover. */
  lift?: number;
  /** Spring-like settle time in ms. */
  duration?: number;
}

export interface TiltControls {
  ref: React.RefObject<HTMLElement | null>;
  /** Spread onto the tilted element (sets the custom properties). */
  style: React.CSSProperties;
  handlers: {
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
    onPointerLeave: () => void;
    onPointerDown: () => void;
  };
}

/**
 * Per-element pointer tilt.
 *
 * Writes `--px`, `--py` and `--lift` onto the element rather than into React
 * state, so moving the pointer never causes a re-render — the CSS
 * `.parallax-tilt` rule does the actual transforming on the compositor.
 */
export function useTilt({
  max = 3,
  lift = 6,
  duration = 160,
}: TiltOptions = {}): TiltControls {
  const ref = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();
  const fine = useHasFinePointer();
  const active = fine && !reduced;

  const setVars = (x: number, y: number, hover: number) => {
    const node = ref.current;
    if (!node) return;
    node.style.setProperty("--px", x.toFixed(4));
    node.style.setProperty("--py", y.toFixed(4));
    node.style.setProperty("--lift", hover.toFixed(2));
  };

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    setVars(x, y, lift);
  };

  const onPointerLeave = () => setVars(0, 0, 0);
  const onPointerDown = () => setVars(0, 0, lift * 0.5);

  return {
    ref,
    style: {
      ["--tilt" as string]: `${max}deg`,
      transitionDuration: `${duration}ms`,
    } as React.CSSProperties,
    handlers: { onPointerMove, onPointerLeave, onPointerDown },
  };
}
