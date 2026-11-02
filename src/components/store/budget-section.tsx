"use client";

import { useCallback, useId, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { useCart } from "@/components/providers";
import { useToast } from "@/components/ui/toast";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Reveal } from "@/components/animated";
import { SectionHeading, SpatialSection } from "@/components/spatial";

export interface BudgetItem {
  id: string;
  name: string;
  price: string;
  mrp: string | null;
  tag: string;
  imageUrl: string | null;
}

export interface BudgetCategory {
  key: string;
  label: string;
  items: BudgetItem[];
}

export function BudgetSection({ catalog }: { catalog: BudgetCategory[] }) {
  const { add } = useCart();
  const toast = useToast();
  const [active, setActive] = useState(catalog[0]?.key ?? "");
  const [addingId, setAddingId] = useState<string | null>(null);
  const current = catalog.find((c) => c.key === active) ?? catalog[0];
  const tabsId = useId();

  const handleAdd = useCallback(
    async (item: BudgetItem) => {
      if (addingId) return;
      setAddingId(item.id);
      try {
        await add(item.id, 1);
        toast.success(`Added “${item.name}” to your cart.`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not add that item.",
        );
      } finally {
        setAddingId(null);
      }
    },
    [add, addingId, toast],
  );

  if (!current || current.items.length === 0) return null;

  return (
    <SpatialSection spacing="normal" surface="glass-inset" id="budget">
      <SectionHeading
        eyebrow="Smart spending"
        title="Shop By Price"
        description="Find the highest-rated picks tailored precisely to your budget limits"
        action={
          <div
            role="tablist"
            aria-label="Price range"
            className="flex max-w-full items-center gap-1.5 overflow-x-auto rounded-full border border-[var(--glass-line)] bg-[var(--glass-fill)] p-1 backdrop-blur-md no-scrollbar"
          >
            {catalog.map((cat) => {
              const selected = active === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  role="tab"
                  id={`${tabsId}-${cat.key}`}
                  aria-selected={selected}
                  aria-controls={`${tabsId}-panel`}
                  onClick={() => setActive(cat.key)}
                  className={cn(
                    "shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-[background-color,color,box-shadow] duration-[var(--dur-fast)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
                    selected
                      ? "bg-[var(--color-foreground)] text-[var(--color-background)] shadow-[var(--spatial-1)]"
                      : "text-[var(--color-muted-foreground)] hover:bg-[var(--glass-fill-strong)] hover:text-[var(--color-foreground)]",
                  )}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        }
      />

      <div
        role="tabpanel"
        id={`${tabsId}-panel`}
        aria-labelledby={`${tabsId}-${active}`}
        className="mt-8"
      >
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {current.items.map((item, index) => {
            const adding = addingId === item.id;
            return (
              <Reveal
                as="li"
                key={item.id}
                variant="up"
                delay={index * 70}
                className="h-full"
              >
                <article className="glass-surface group flex h-full flex-col overflow-hidden rounded-[var(--radius-tile)] transition-[transform,border-color,box-shadow] duration-[var(--dur-base)] ease-[var(--ease-spatial)] hover:-translate-y-1 hover:border-[var(--glass-ring)] hover:shadow-[var(--spatial-2)] motion-reduce:hover:translate-y-0">
                  <div className="relative aspect-square overflow-hidden bg-[var(--glass-fill-soft)]">
                    <ImageWithFallback
                      src={item.imageUrl ?? undefined}
                      alt={item.name}
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-[var(--dur-slow)] ease-[var(--ease-spatial)] group-hover:scale-[1.05] motion-reduce:group-hover:scale-100"
                    />
                    <span className="absolute left-2 top-2 rounded-md border border-[var(--glass-line)] bg-[var(--glass-fill-strong)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-foreground)] backdrop-blur-md">
                      {item.tag}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-3">
                    <h4 className="line-clamp-2 text-[13px] font-medium leading-snug text-[var(--color-foreground)]">
                      {item.name}
                    </h4>
                    <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5">
                      <span className="text-sm font-semibold text-[var(--color-foreground)]">
                        {item.price}
                      </span>
                      {item.mrp && (
                        <span className="text-[11px] text-[var(--color-muted-foreground)] line-through">
                          {item.mrp}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={adding}
                      onClick={() => handleAdd(item)}
                      className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-full border border-[var(--glass-line)] bg-[var(--glass-fill)] py-2 text-[13px] font-medium text-[var(--color-foreground)] backdrop-blur-md transition-[background-color,border-color,color] duration-[var(--dur-fast)] hover:border-[var(--color-foreground)]/40 hover:bg-[var(--color-foreground)] hover:text-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[var(--glass-fill)] disabled:hover:text-[var(--color-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                    >
                      {adding ? (
                        "Adding…"
                      ) : (
                        <>
                          <Plus aria-hidden className="size-3.5" />
                          Add for {item.price}
                        </>
                      )}
                    </button>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </SpatialSection>
  );
}
