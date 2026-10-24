import type { Metadata } from "next";
import { Mail, MapPin, MessageSquare } from "lucide-react";
import { ContactForm } from "@/components/store/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Aurora team — orders, returns, or anything else.",
};

const CHANNELS = [
  {
    icon: Mail,
    label: "Email",
    value: "support@aurorastore.example",
    note: "Replies within one business day",
  },
  {
    icon: MessageSquare,
    label: "Order support",
    value: "Include your order reference",
    note: "Fastest route for delivery issues",
  },
  {
    icon: MapPin,
    label: "Store hours",
    value: "Mon–Sat, 10:00–18:00 IST",
    note: "Public holidays excluded",
  },
];

export default function ContactPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)] sm:text-3xl">
          Contact us
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-muted-foreground)]">
          Questions about an order, a return, or a product listing — send a
          message and a human will get back to you.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_18rem]">
          <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5 sm:p-6">
            <ContactForm />
          </div>

          <aside className="flex flex-col gap-3">
            {CHANNELS.map((channel) => (
              <div
                key={channel.label}
                className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-muted)] p-4"
              >
                <div className="flex items-center gap-2 text-[var(--color-primary)]">
                  <channel.icon className="size-4" aria-hidden />
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    {channel.label}
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-medium text-[var(--color-foreground)]">
                  {channel.value}
                </p>
                <p className="text-xs text-[var(--color-muted-foreground)]">{channel.note}</p>
              </div>
            ))}
          </aside>
        </div>
      </div>
    </div>
  );
}
