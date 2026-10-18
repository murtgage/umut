import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export type BadgeTone =
  | "neutral"
  | "brand"
  | "accent"
  | "success"
  | "danger"
  | "warning"
  | "gold";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-elevated text-ink-muted border-line-strong",
  brand: "bg-brand/15 text-brand-soft border-brand/40",
  accent: "bg-accent/15 text-accent border-accent/40",
  success: "bg-success/15 text-success border-success/40",
  danger: "bg-danger/15 text-danger border-danger/40",
  warning: "bg-warning/15 text-warning border-warning/40",
  gold: "bg-gold/15 text-gold border-gold/40",
};

export interface BadgeProps extends ComponentProps<"span"> {
  tone?: BadgeTone;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    />
  );
}
