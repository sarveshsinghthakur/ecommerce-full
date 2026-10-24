/**
 * Slug utilities.
 *
 * Slugs are generated from marketplace titles which routinely contain emoji,
 * diacritics and trademark symbols, so the transliteration is deliberately
 * conservative: everything that is not a lowercase ASCII alphanumeric becomes a
 * separator.
 */
const COMBINING_MARKS = /[̀-ͯ]/g;

export function slugify(input: string, maxLength = 96): string {
  const normalized = input
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
  return normalized || "item";
}

/** Appends `-2`, `-3`, ... until `isTaken` returns false. */
export async function uniqueSlug(
  base: string,
  isTaken: (candidate: string) => Promise<boolean>,
  limit = 200,
): Promise<string> {
  const root = slugify(base);
  if (!(await isTaken(root))) return root;
  for (let i = 2; i <= limit; i++) {
    const candidate = `${root}-${i}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  // Deterministic fallback: caller can surface this as a retryable conflict.
  return `${root}-${Date.now().toString(36)}`;
}
