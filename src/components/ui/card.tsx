import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("surface-card", className)} {...props} />;
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-1 px-5 pt-5 pb-3", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<"h2">) {
  return (
    <h2
      className={cn("text-base font-semibold tracking-tight text-ink", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p className={cn("text-sm leading-relaxed text-ink-muted", className)} {...props} />
  );
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("px-5 py-3", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-t border-line px-5 py-4",
        className,
      )}
      {...props}
    />
  );
}
