import { MessageSquareText, Star } from "lucide-react";
import type { ProductCard as ProductSummary } from "@/server/catalog";
import { SectionHeading } from "@/components/spatial";

interface ProductReviewsProps {
  product: ProductSummary;
}

/** Renders five stars, filled to the nearest half from a 0–5 average. */
function StarRow({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((step) => {
        const fill = Math.min(Math.max(rating - (step - 1), 0), 1);
        return (
          <span key={step} className="relative inline-block">
            <Star className="size-4 text-[var(--color-muted-foreground)]/40" strokeWidth={1.5} />
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star
                className="size-4 fill-current text-[var(--color-warning)]"
                strokeWidth={1.5}
              />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/**
 * Review summary.
 *
 * Loop Studio stores an aggregate rating and review count but has no review
 * bodies, photos or per-review votes in the catalogue. This panel therefore
 * shows only those two real numbers, and says plainly that written reviews
 * aren't available yet — rather than inventing reviewer names, a star
 * distribution and a customer photo gallery the way the previous version did.
 */
export function ProductReviews({ product }: ProductReviewsProps) {
  const hasRating = product.rating !== null && product.rating !== undefined;
  const rating = hasRating ? Number(product.rating) : 0;
  const reviewCount = product.reviewCount ?? 0;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-8">
      {/* Scorecard */}
      <div className="lg:w-1/3">
        <SectionHeading id="reviews" eyebrow="Customer feedback" title="Reviews" />
        <div className="glass-surface mt-6 flex flex-col items-start gap-3 rounded-[var(--radius-panel)] p-6">
          {hasRating && reviewCount > 0 ? (
            <>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-bold leading-none tabular-nums tracking-tight text-[var(--color-foreground)]">
                  {rating.toFixed(1)}
                </span>
                <span className="text-sm text-[var(--color-muted-foreground)]">
                  out of 5
                </span>
              </div>
              <StarRow rating={rating} />
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Based on{" "}
                <span className="font-semibold tabular-nums text-[var(--color-foreground)]">
                  {reviewCount.toLocaleString()}
                </span>{" "}
                {reviewCount === 1 ? "rating" : "ratings"} from Loop Studio
                customers.
              </p>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
              This product hasn’t been rated yet. Ratings appear here as soon
              as the first customers check out.
            </p>
          )}
        </div>
      </div>

      {/* Written reviews */}
      <div className="lg:w-2/3">
        <div className="glass-inset flex h-full flex-col items-start justify-center gap-3 rounded-[var(--radius-panel)] p-6 sm:p-8">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]">
            <MessageSquareText
              aria-hidden
              className="size-4.5"
              strokeWidth={1.75}
            />
            Written reviews aren’t published yet
          </span>
          <p className="max-w-xl text-sm leading-relaxed text-[var(--color-muted-foreground)]">
            We show the aggregate score Loop Studio records for every listing.
            Individual review text and customer photos are not part of the
            catalogue yet, so nothing is displayed here rather than showing
            summaries we can’t verify.
          </p>
          {reviewCount > 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              You’re looking at one of{" "}
              <span className="font-semibold tabular-nums text-[var(--color-foreground)]">
                {reviewCount.toLocaleString()}
              </span>{" "}
              {reviewCount === 1 ? "customer" : "customers"} who rated this
              item.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
