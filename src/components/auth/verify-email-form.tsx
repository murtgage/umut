"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { emailOtp } from "@/lib/auth-client";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export function VerifyEmailForm({
  email,
  nextPath,
  initiallySent,
  devCode,
}: {
  email: string;
  nextPath: string;
  initiallySent: boolean;
  devCode: string | null;
}) {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(initiallySent);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => {
      setCooldown((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleVerify = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);
      setInfo(null);

      const code = otp.replace(/\D/g, "").slice(0, OTP_LENGTH);
      if (code.length !== OTP_LENGTH) {
        setError(`Kod ${OTP_LENGTH} haneli olmalı.`);
        return;
      }

      setVerifying(true);
      try {
        const result = await emailOtp.verifyEmail({ email, otp: code });

        if (result.error) {
          setError(
            result.error.message ??
              "Kod doğrulanamadı. Kodu kontrol edip tekrar dene.",
          );
          return;
        }

        router.replace(nextPath);
        router.refresh();
      } catch {
        setError("Sunucuya ulaşılamadı. Lütfen tekrar dene.");
      } finally {
        setVerifying(false);
      }
    },
    [email, nextPath, otp, router],
  );

  async function handleResend() {
    setError(null);
    setInfo(null);
    setSending(true);

    try {
      const result = await emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });

      if (result.error) {
        setError(result.error.message ?? "Kod gönderilemedi. Lütfen bekle ve tekrar dene.");
        return;
      }

      setSent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setInfo("Yeni kod gönderildi. Gelen kutunu (ve spam klasörünü) kontrol et.");
      // Sunucu bileşeni geliştirme modunda kodu gösterebilsin diye yenile.
      router.refresh();
    } catch {
      setError("Sunucuya ulaşılamadı.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleVerify} className="flex flex-col gap-4" noValidate>
      <div className="rounded-xl border border-line bg-canvas/50 px-4 py-3 text-sm text-ink-muted">
        {sent ? (
          <>
            <span className="font-semibold text-ink">{email}</span> adresine{" "}
            {OTP_LENGTH} haneli bir doğrulama kodu gönderdik.
          </>
        ) : (
          <>
            <span className="font-semibold text-ink">{email}</span> adresine
            doğrulama kodu göndermemiz gerekiyor.
          </>
        )}
      </div>

      {devCode ? (
        <p className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm text-warning">
          Geliştirme modu — e-posta gönderilmedi. Kodun:{" "}
          <strong className="tnum tracking-[0.2em]">{devCode}</strong>
          <br />
          <span className="text-xs opacity-80">
            (SMTP ayarlanınca bu kutu kaybolur.)
          </span>
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="otp">Doğrulama kodu</Label>
        <Input
          id="otp"
          name="otp"
          ref={inputRef}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={OTP_LENGTH}
          value={otp}
          onChange={(event) =>
            setOtp(event.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))
          }
          placeholder="123456"
          className="tnum text-center text-lg tracking-[0.4em]"
        />
      </div>

      {error ? <FieldError>{error}</FieldError> : null}
      {info ? <p className="text-sm text-success">{info}</p> : null}

      <Button
        type="submit"
        size="lg"
        disabled={verifying || otp.length !== OTP_LENGTH}
        className="w-full"
      >
        {verifying ? "Doğrulanıyor…" : "Doğrula"}
      </Button>

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleResend}
          disabled={sending || cooldown > 0}
        >
          {cooldown > 0
            ? `Tekrar gönder (${cooldown} sn)`
            : sending
              ? "Gönderiliyor…"
              : sent
                ? "Kodu tekrar gönder"
                : "Kodu gönder"}
        </Button>

        <button
          type="button"
          className="text-xs text-ink-faint transition hover:text-ink-muted"
          onClick={async () => {
            const { authClient } = await import("@/lib/auth-client");
            await authClient.signOut();
            router.replace("/giris");
            router.refresh();
          }}
        >
          Farklı bir hesapla giriş yap
        </button>
      </div>
    </form>
  );
}
