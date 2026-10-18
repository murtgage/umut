import { cn } from "@/lib/utils";

export interface ProgressProps {
  /** 0-1 arası ilerleme oranı. */
  value: number;
  className?: string;
  barClassName?: string;
  label?: string;
}

export function Progress({ value, className, barClassName, label }: ProgressProps) {
  const clamped = Math.min(1, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      aria-label={label}
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-canvas/80 ring-1 ring-line/70 ring-inset",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r from-brand to-accent transition-[width] duration-300 ease-out",
          barClassName,
        )}
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  );
}
