import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Renders an inline error message and marks the field invalid. */
  error?: string | null;
  /** Optional right-hand adornment (unit, clear button, …). */
  trailing?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, trailing, id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className="relative w-full">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={cn(
            "h-10 w-full rounded-[var(--radius-control)] border bg-white px-3 text-sm text-[var(--color-foreground)]",
            "placeholder:text-[var(--color-muted-foreground)]",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent",
            "disabled:cursor-not-allowed disabled:bg-[var(--color-muted)] disabled:text-[var(--color-muted-foreground)]",
            error
              ? "border-[var(--color-destructive)] focus:ring-[var(--color-destructive)]"
              : "border-[var(--color-input)]",
            trailing && "pr-10",
            className,
          )}
          {...props}
        />
        {trailing ? (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--color-muted-foreground)] [&>*]:pointer-events-auto">
            {trailing}
          </div>
        ) : null}
        {error ? (
          <p id={errorId} className="mt-1.5 text-xs text-[var(--color-destructive)]">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string | null;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const errorId = error ? `${inputId}-error` : undefined;
    return (
      <div className="w-full">
        <textarea
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={cn(
            "min-h-24 w-full rounded-[var(--radius-control)] border bg-white px-3 py-2 text-sm text-[var(--color-foreground)]",
            "placeholder:text-[var(--color-muted-foreground)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent",
            "disabled:cursor-not-allowed disabled:bg-[var(--color-muted)]",
            error
              ? "border-[var(--color-destructive)] focus:ring-[var(--color-destructive)]"
              : "border-[var(--color-input)]",
            className,
          )}
          {...props}
        />
        {error ? (
          <p id={errorId} className="mt-1.5 text-xs text-[var(--color-destructive)]">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string | null;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, id, ...props }, ref) => {
    const autoId = useId();
    const selectId = id ?? autoId;
    const errorId = error ? `${selectId}-error` : undefined;
    return (
      <div className="w-full">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={cn(
            "h-10 w-full appearance-none rounded-[var(--radius-control)] border bg-white px-3 pr-9 text-sm text-[var(--color-foreground)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent",
            "disabled:cursor-not-allowed disabled:bg-[var(--color-muted)]",
            error
              ? "border-[var(--color-destructive)] focus:ring-[var(--color-destructive)]"
              : "border-[var(--color-input)]",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        {error ? (
          <p id={errorId} className="mt-1.5 text-xs text-[var(--color-destructive)]">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
Select.displayName = "Select";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function Label({ className, children, required, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-sm font-medium text-[var(--color-foreground)]",
        className,
      )}
      {...props}
    >
      {children}
      {required ? (
        <span className="ml-0.5 text-[var(--color-destructive)]" aria-hidden>
          *
        </span>
      ) : null}
    </label>
  );
}
