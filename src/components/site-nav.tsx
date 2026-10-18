"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { Logo } from "@/components/logo";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface NavUser {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
  isAdmin: boolean;
  level: number;
  totalScore: number;
}

const LINKS = [
  { href: "/oyna", label: "Oyna" },
  { href: "/siralama", label: "Sıralama" },
  { href: "/profil", label: "Profil" },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav({ user }: { user: NavUser | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    setBusy(true);
    try {
      await signOut();
      setMenuOpen(false);
      router.replace("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-canvas/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Logo />

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(pathname, link.href)
                  ? "bg-elevated text-ink"
                  : "text-ink-muted hover:bg-elevated/60 hover:text-ink",
              )}
            >
              {link.label}
            </Link>
          ))}
          {user?.isAdmin ? (
            <Link
              href="/admin"
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(pathname, "/admin")
                  ? "bg-elevated text-ink"
                  : "text-warning hover:bg-elevated/60",
              )}
            >
              Yönetim
            </Link>
          ) : null}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/profil"
                className="hidden items-center gap-2.5 rounded-xl border border-line bg-elevated/60 py-1.5 pr-3 pl-1.5 transition-colors hover:border-line-strong sm:flex"
              >
                <Avatar name={user.name} image={user.image} size="sm" />
                <span className="flex flex-col leading-tight">
                  <span className="text-xs font-semibold text-ink">
                    {user.username ?? user.name}
                  </span>
                  <span className="text-[0.65rem] text-ink-faint">
                    Sv. {user.level} · {formatNumber(user.totalScore)} puan
                  </span>
                </span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={busy}
                className={buttonVariants({
                  variant: "ghost",
                  size: "sm",
                  className: "hidden md:inline-flex",
                })}
              >
                Çıkış
              </button>
            </>
          ) : (
            <>
              <Link
                href="/giris"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Giriş
              </Link>
              <Link
                href="/kayit"
                className={buttonVariants({ variant: "primary", size: "sm" })}
              >
                Ücretsiz başla
              </Link>
            </>
          )}

          <button
            type="button"
            aria-label="Menüyü aç/kapat"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className={buttonVariants({
              variant: "secondary",
              size: "icon",
              className: "md:hidden",
            })}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            >
              {menuOpen ? (
                <>
                  <path d="m6 6 12 12" />
                  <path d="m18 6-12 12" />
                </>
              ) : (
                <>
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-line bg-surface/95 px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium",
                  isActive(pathname, link.href)
                    ? "bg-elevated text-ink"
                    : "text-ink-muted",
                )}
              >
                {link.label}
              </Link>
            ))}
            {user?.isAdmin ? (
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-warning"
              >
                Yönetim
              </Link>
            ) : null}
            {user ? (
              <button
                type="button"
                onClick={handleSignOut}
                disabled={busy}
                className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-danger"
              >
                Çıkış yap
              </button>
            ) : (
              <Link
                href="/giris"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-muted"
              >
                Giriş yap
              </Link>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
