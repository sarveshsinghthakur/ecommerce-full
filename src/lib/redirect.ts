/**
 * Only ever redirect to a same-site path.
 *
 * Accepts `"/cart"`, rejects `"https://evil.example"`, `"//evil.example"`
 * (protocol-relative) and `"/\\evil.example"`.
 */
export function safeNextPath(raw: string | undefined | null, fallback = "/"): string {
  if (typeof raw !== "string") return fallback;
  const value = raw.trim();
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.includes("\\") || value.includes("..")) return fallback;
  return value;
}
