import Link from "next/link";
import { Reveal } from "@/components/animated";

export interface StaticSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

/** Consistent shell for policy, FAQ and informational pages. */
export function StaticPage({
  title,
  intro,
  updated,
  sections,
  aside,
}: {
  title: string;
  intro: string;
  /** Optional "last updated" note; omit for evergreen pages like About. */
  updated?: string;
  sections: StaticSection[];
  aside?: React.ReactNode;
}) {
  return (
    <div className="container-page py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <Reveal variant="left">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--color-accent)]">
            <span className="opacity-60">{"// "}</span>Documentation
          </p>
        </Reveal>
        <Reveal variant="blur" delay={80}>
          <h1 className="mt-3 text-balance text-2xl font-semibold tracking-tight text-[var(--color-foreground)] sm:text-3xl">
            {title}
          </h1>
        </Reveal>
        <Reveal delay={180}>
          <p className="mt-3 text-base leading-relaxed text-[var(--color-muted-foreground)]">
            {intro}
          </p>
        </Reveal>
        {updated ? (
          <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">Last updated {updated}</p>
        ) : null}

        <div className="mt-9 space-y-9">
          {sections.map((section, index) => (
            <Reveal key={section.heading} delay={(index % 4) * 70}>
              <section>
                <h2 className="text-base font-semibold text-[var(--color-foreground)]">
                  {section.heading}
                </h2>
                {section.paragraphs?.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="mt-2.5 text-sm leading-relaxed text-[var(--color-muted-foreground)]"
                  >
                    {paragraph}
                  </p>
                ))}
                {section.bullets ? (
                  <ul className="mt-3 space-y-2">
                    {section.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="flex gap-2.5 text-sm leading-relaxed text-[var(--color-muted-foreground)]"
                      >
                        <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            </Reveal>
          ))}
        </div>

        {aside}
      </div>
    </div>
  );
}

export function HelpCta({
  heading = "Still have a question?",
  body = "Our team replies within one business day.",
}: {
  heading?: string;
  body?: string;
}) {
  return (
    <div className="mt-10 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-muted)] p-5">
      <p className="text-sm font-semibold text-[var(--color-foreground)]">{heading}</p>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{body}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/contact"
          className="inline-flex h-9 items-center rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
        >
          Contact us
        </Link>
        <Link
          href="/faq"
          className="inline-flex h-9 items-center rounded-[var(--radius-control)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
        >
          Read the FAQ
        </Link>
      </div>
    </div>
  );
}
