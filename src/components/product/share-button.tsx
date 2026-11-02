"use client";

import { useCallback, useState } from "react";
import { Check, Share2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";

/**
 * Shares the current product URL via the Web Share API where available,
 * falling back to copying it to the clipboard. Replaces a decorative
 * "Share" button that was rendered with no click handler at all.
 */
export function ShareButton({ title }: { title: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const url = typeof window === "undefined" ? "" : window.location.href;

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        // A dismissed share sheet isn't an error worth surfacing.
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn’t copy the link. Try copying it from the address bar.");
    }
  }, [title, toast]);

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-line)] bg-[var(--glass-fill)] px-3.5 py-1.5 text-xs font-medium text-[var(--color-foreground)] backdrop-blur-md transition-[background-color,border-color] duration-[var(--dur-fast)] hover:border-[var(--glass-line-strong)] hover:bg-[var(--glass-fill-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
    >
      {copied ? (
        <>
          <Check aria-hidden className="size-3.5" />
          Copied
        </>
      ) : (
        <>
          <Share2 aria-hidden className="size-3.5" />
          Share
        </>
      )}
    </button>
  );
}
