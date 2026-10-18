import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-line bg-canvas/60 px-3.5 text-sm text-ink",
        "placeholder:text-ink-faint",
        "transition-colors focus:border-brand-soft focus:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cn("text-sm font-medium text-ink-muted", className)}
      {...props}
    />
  );
}

export function FieldError({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      role="alert"
      className={cn("text-sm text-danger", className)}
      {...props}
    />
  );
}
