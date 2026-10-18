import Link from "next/link";

import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-accent shadow-lg shadow-brand/30",
        className,
      )}
    >
      {/* Yükselen bir ışık: Umut */}
      <svg
        viewBox="0 0 24 24"
        className="size-5 text-white"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
      >
        <path d="M12 3v6" />
        <path d="M6.5 8.5 12 15l5.5-6.5" />
        <path d="M12 15v6" />
      </svg>
    </span>
  );
}

export function Logo({
  className,
  href = "/",
  withTagline = true,
}: {
  className?: string;
  href?: string;
  withTagline?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("group flex items-center gap-2.5", className)}
      aria-label="Umut ana sayfa"
    >
      <LogoMark className="transition-transform group-hover:-translate-y-0.5" />
      <span className="flex flex-col leading-none">
        <span className="text-lg font-bold tracking-tight text-ink">
          umut
        </span>
        {withTagline ? (
          <span className="text-[0.65rem] font-semibold tracking-[0.18em] text-ink-faint uppercase">
            KPSS Arena
          </span>
        ) : null}
      </span>
    </Link>
  );
}
