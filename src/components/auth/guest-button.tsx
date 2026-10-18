"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button, type ButtonProps } from "@/components/ui/button";
import { signIn } from "@/lib/auth-client";

/**
 * Tek tıkla anonim (misafir) oturum açar ve oyuna götürür.
 * Misafir oyuncu `GUEST_RUN_LIMIT` tur oynayabilir; sonra kayıt olması istenir.
 */
export function GuestButton({
  label = "Üye olmadan dene",
  nextPath = "/oyna",
  variant = "secondary",
  size = "md",
  className,
}: {
  label?: string;
  nextPath?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setPending(true);

    try {
      const result = await signIn.anonymous();

      if (result.error) {
        setError("Misafir oturumu açılamadı. Lütfen tekrar dene.");
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Sunucuya ulaşılamadı. Lütfen tekrar dene.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-1.5">
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
        disabled={pending}
      >
        {pending ? "Hazırlanıyor…" : label}
      </Button>
      {error ? (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      ) : null}
    </div>
  );
}
