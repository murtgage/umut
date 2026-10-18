import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "success";

export type ButtonSize = "sm" | "md" | "lg" | "icon";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-b from-brand to-brand-strong text-white shadow-lg shadow-brand/25 hover:from-brand-strong hover:to-brand-deep active:shadow-none",
  secondary:
    "bg-elevated text-ink border border-line hover:bg-line/60 hover:border-line-strong",
  outline:
    "border border-line-strong text-ink hover:bg-elevated hover:border-brand-soft/60",
  ghost: "text-ink-muted hover:bg-elevated hover:text-ink",
  danger:
    "bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25",
  success:
    "bg-success/15 text-success border border-success/40 hover:bg-success/25",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-base gap-2 rounded-xl",
  icon: "h-10 w-10 rounded-xl",
};

/** Yalnızca sınıf üretir; `<Link>` gibi öğeleri buton gibi göstermek için kullanılır. */
export function buttonVariants(options?: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const { variant = "primary", size = "md", className } = options ?? {};
  return cn(
    "inline-flex select-none items-center justify-center font-medium transition-all",
    "disabled:pointer-events-none disabled:opacity-50",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  );
}

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  );
}
