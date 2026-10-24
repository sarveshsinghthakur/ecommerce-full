"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

interface FieldErrors {
  [key: string]: string[];
}

export function ContactForm() {
  const toast = useToast();
  const [values, setValues] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    website: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  function update(key: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setErrors({});
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors(body.fieldErrors ?? {});
        setStatus("idle");
        toast.error(body.error ?? "Could not send your message.");
        return;
      }
      setStatus("sent");
      toast.success("Message sent — we will reply within one business day.");
      setValues({ name: "", email: "", subject: "", message: "", website: "" });
    } catch {
      setStatus("idle");
      toast.error("Network error. Please try again.");
    }
  }

  if (status === "sent") {
    return (
      <div
        role="status"
        className="rounded-[var(--radius-card)] border border-[var(--color-success-soft)] bg-[var(--color-success-soft)]/40 p-6"
      >
        <p className="text-sm font-semibold text-[var(--color-success)]">
          Your message is on its way
        </p>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          We reply to every message within one business day. For order issues,
          include your order reference in a follow-up.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4 bg-white"
          onClick={() => setStatus("idle")}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="contact-name" required>
            Your name
          </Label>
          <Input
            id="contact-name"
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
            error={errors.name?.[0]}
            autoComplete="name"
            required
          />
        </div>
        <div>
          <Label htmlFor="contact-email" required>
            Email
          </Label>
          <Input
            id="contact-email"
            type="email"
            value={values.email}
            onChange={(e) => update("email", e.target.value)}
            error={errors.email?.[0]}
            autoComplete="email"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="contact-subject" required>
          Subject
        </Label>
        <Input
          id="contact-subject"
          value={values.subject}
          onChange={(e) => update("subject", e.target.value)}
          error={errors.subject?.[0]}
          required
        />
      </div>

      <div>
        <Label htmlFor="contact-message" required>
          Message
        </Label>
        <Textarea
          id="contact-message"
          value={values.message}
          onChange={(e) => update("message", e.target.value)}
          error={errors.message?.[0]}
          rows={6}
          required
        />
        <p className="mt-1.5 text-xs text-[var(--color-muted-foreground)]">
          Include an order reference if your question is about an existing order.
        </p>
      </div>

      {/* Honeypot — hidden from real users, filled by naive bots. */}
      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden>
        <label htmlFor="contact-website">Leave this field empty</label>
        <input
          id="contact-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(e) => update("website", e.target.value)}
        />
      </div>

      <div>
        <Button type="submit" loading={status === "sending"}>
          {status === "sending" ? "Sending…" : "Send message"}
        </Button>
      </div>
    </form>
  );
}
