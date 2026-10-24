import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, Store } from "lucide-react";
import { getOptionalUser, resolveAdmin } from "@/lib/auth/authorize";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
] as const;

function initialsOf(email: string): string {
  const handle = email.split("@")[0] ?? email;
  const parts = handle.split(/[._-]+/).filter(Boolean);
  const a = parts[0]?.[0] ?? handle[0] ?? "A";
  const b = parts[1]?.[0] ?? a;
  return `${a}${b}`.toUpperCase();
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getOptionalUser();
  if (!user) redirect("/login?next=/admin");
  const admin = await resolveAdmin(user);
  if (!admin) redirect("/?admin=denied");

  return (
    <div className="min-h-dvh bg-[var(--color-muted)]">
      <header className="border-b border-[var(--color-border)] bg-white">
        <div className="container-page flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link
              href="/admin"
              className="text-sm font-semibold tracking-tight text-[var(--color-foreground)]"
            >
              Aurora <span className="text-[var(--color-primary)]">Admin</span>
            </Link>
            <nav aria-label="Admin" className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                >
                  <item.icon className="size-4" aria-hidden />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
            >
              <Store className="size-3.5" aria-hidden />
              View store
            </Link>
            <span
              className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-primary-soft)] text-xs font-semibold text-[var(--color-primary)]"
              title={user.email}
            >
              {initialsOf(user.email)}
            </span>
          </div>
        </div>
      </header>

      <main className="container-page py-8">{children}</main>
    </div>
  );
}
