"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";

export function FocusModeToggle() {
  const [focus, setFocus] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("loop_focus_mode") === "1";
    setFocus(saved);
    document.documentElement.classList.toggle("focus-mode", saved);
  }, []);

  function toggle() {
    const next = !focus;
    setFocus(next);
    window.localStorage.setItem("loop_focus_mode", next ? "1" : "0");
    document.documentElement.classList.toggle("focus-mode", next);
  }

  return (
    <button type="button" onClick={toggle} aria-pressed={focus} aria-label={focus ? "Turn off focus mode" : "Turn on focus mode"} title={focus ? "Exit focus mode" : "Focus mode"} className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)] transition hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]">
      {focus ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
    </button>
  );
}
