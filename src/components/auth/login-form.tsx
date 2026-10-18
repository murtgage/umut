"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { signIn } from "@/lib/auth-client";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmed = identifier.trim();
    if (!trimmed || !password) {
      setError("Kullanıcı adı/e-posta ve şifre gerekli.");
      return;
    }

    setPending(true);
    try {
      const result = trimmed.includes("@")
        ? await signIn.email({ email: trimmed, password })
        : await signIn.username({ username: trimmed, password });

      if (result.error) {
        setError(
          result.error.message ??
            "Giriş yapılamadı. Bilgilerini kontrol edip tekrar dene.",
        );
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch {
      setError("Sunucuya ulaşılamadı. Lütfen tekrar dene.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="identifier">Kullanıcı adı veya e-posta</Label>
        <Input
          id="identifier"
          name="identifier"
          autoComplete="username"
          autoFocus
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="umut42 veya ad@ornek.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Şifre</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
        />
      </div>

      {error ? <FieldError>{error}</FieldError> : null}

      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        {pending ? "Giriş yapılıyor…" : "Giriş yap"}
      </Button>

      <p className="text-center text-sm text-ink-muted">
        Hesabın yok mu?{" "}
        <Link
          href="/kayit"
          className="font-medium text-brand-soft hover:underline"
        >
          Ücretsiz kayıt ol
        </Link>
      </p>
    </form>
  );
}
