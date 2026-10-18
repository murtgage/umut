"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { emailOtp, signUp } from "@/lib/auth-client";

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,24}$/;

export function RegisterForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedUsername = username.trim().toLowerCase();
    const trimmedEmail = email.trim();

    if (trimmedName.length < 2) {
      setError("Adını gir (en az 2 karakter).");
      return;
    }
    if (!USERNAME_PATTERN.test(trimmedUsername)) {
      setError(
        "Kullanıcı adı 3-24 karakter olmalı; yalnızca harf, rakam ve alt çizgi kullanabilirsin.",
      );
      return;
    }
    if (!trimmedEmail.includes("@")) {
      setError("Geçerli bir e-posta adresi gir.");
      return;
    }
    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalı.");
      return;
    }

    setPending(true);
    try {
      const result = await signUp.email({
        name: trimmedName,
        email: trimmedEmail,
        password,
        username: trimmedUsername,
      });

      if (result.error) {
        setError(
          result.error.message ??
            "Kayıt tamamlanamadı. Farklı bir kullanıcı adı veya e-posta dene.",
        );
        return;
      }

      // Kayıt başarılı: e-posta doğrulama kodunu gönder ve doğrulama ekranına geç.
      try {
        await emailOtp.sendVerificationOtp({
          email: trimmedEmail,
          type: "email-verification",
        });
      } catch {
        // Kod gönderilemese bile doğrulama ekranına geçiyoruz; kullanıcı orada
        // "Kodu tekrar gönder" ile yeniden deneyebilir.
      }

      router.replace(
        `/dogrula?gonderildi=1&next=${encodeURIComponent(nextPath)}`,
      );
      router.refresh();
    } catch {
      setError("Sunucuya ulaşılamadı. Lütfen tekrar dene.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Ad Soyad</Label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Umut Yılmaz"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="username">Kullanıcı adı</Label>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="umut42"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-posta</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="ad@ornek.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Şifre</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="En az 6 karakter"
        />
      </div>

      {error ? <FieldError>{error}</FieldError> : null}

      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        {pending ? "Hesap oluşturuluyor…" : "Hesabımı oluştur"}
      </Button>

      <p className="text-center text-sm text-ink-muted">
        Zaten üye misin?{" "}
        <Link
          href="/giris"
          className="font-medium text-brand-soft hover:underline"
        >
          Giriş yap
        </Link>
      </p>
    </form>
  );
}
