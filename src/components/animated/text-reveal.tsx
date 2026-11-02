import { cn } from "@/lib/cn";

interface TextRevealProps {
  /** Headline text; split into words and revealed left→right. */
  text: string;
  className?: string;
  /** Extra class applied to every animated word (e.g. `gradient-text`). */
  wordClassName?: string;
  /** Element type to render (default `h2`). */
  as?: "h1" | "h2" | "h3" | "p" | "span";
  /** First word delay in ms. */
  delay?: number;
  /** Delay added per word, ms. */
  step?: number;
}

/**
 * Word-by-word headline reveal (blur → visible with a small rise).
 *
 * Pure CSS animation on the SSR markup — it runs as soon as the HTML paints,
 * so it needs no JavaScript, works above the fold without an observer, and is
 * disabled under `prefers-reduced-motion`.
 */
export function TextReveal({
  text,
  className,
  wordClassName,
  as: Tag = "h2",
  delay = 60,
  step = 55,
}: TextRevealProps) {
  const words = text.split(/\s+/).filter(Boolean);

  return (
    <Tag className={cn("text-reveal", className)}>
      {words.map((word, index) => (
        <span key={`${word}-${index}`}>
          <span
            className={cn("word", wordClassName)}
            style={
              { "--word-delay": `${delay + index * step}ms` } as React.CSSProperties
            }
          >
            {word}
          </span>
          {index < words.length - 1 ? " " : null}
        </span>
      ))}
    </Tag>
  );
}
