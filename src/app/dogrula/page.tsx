import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";
import { isMailTransportConfigured } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "E-postanı doğrula",
  description: "Hesabını aktifleştirmek için e-postana gelen 6 haneli kodu gir.",
  robots: { index: false },
};

const DEFAULT_NEXT = "/oyna";

/** Yalnızca site içi göreli yolları kabul et (açık yönlendirme koruması). */
function safeNext(value: string | undefined): string {
  if (!value) return DEFAULT_NEXT;
  if (!value.startsWith("/") || value.startsWith("//")) return DEFAULT_NEXT;
  return value;
}

/**
 * Bekleyen e-posta doğrulama kodunu (OTP) veritabanından okur.
 *
 * better-auth `emailOTP` eklentisi kodu `verification` tablosuna düz metin
 * yazar (`storeOTP: "plain"` varsayılanı) ve tanımlayıcı olarak
 * `${type}-otp-${email}` biçimini kullanır. Vercel'de dosya sistemi salt-okunur
 * olduğu için dosya tabanlı geliştirme kutusu çalışmaz; bu yüzden kodu
 * doğrudan tablodan okuyoruz.
 */
async function readPendingOtp(email: string): Promise<string | null> {
  const identifiers = [
    ...new Set([email, email.toLowerCase(), email.toUpperCase()]),
  ].map((value) => `email-verification-otp-${value}`);

  const record = await prisma.verification.findFirst({
    where: { identifier: { in: identifiers } },
    orderBy: { createdAt: "desc" },
    select: { value: true, expiresAt: true },
  });

  if (!record || record.expiresAt.getTime() < Date.now()) return null;

  // better-auth tekrar gönderimde değeri `<kod>:<deneme>` olarak saklayabilir.
  const separator = record.value.lastIndexOf(":");
  const code = (
    separator === -1 ? record.value : record.value.slice(0, separator)
  ).trim();

  return /^\d{6}$/.test(code) ? code : null;
}

export default async function VerifyEmailPage(props: PageProps<"/dogrula">) {
  const session = await getSession();

  if (!session) {
    redirect("/giris?next=%2Fdogrula");
  }

  const searchParams = await props.searchParams;
  const rawNext = searchParams.next;
  const nextPath = safeNext(Array.isArray(rawNext) ? rawNext[0] : rawNext);

  if (session.user.emailVerified) {
    redirect(nextPath);
  }

  const email = session.user.email;
  const initiallySent = searchParams.gonderildi === "1";

  // E-posta sunucusu (SMTP) ayarlı değilse kod kullanıcıya hiç ulaşamaz; bu
  // durumda kodu ekranda da gösteriyoruz ki paylaşılan demo kilitlenmesin.
  const devCode = isMailTransportConfigured ? null : await readPendingOtp(email);

  return (
    <AuthShell
      title="E-postanı doğrula"
      description={
        isMailTransportConfigured
          ? `${email} adresine 6 haneli bir doğrulama kodu gönderdik. Kodu girerek hesabını aktifleştir.`
          : `${email} için 6 haneli doğrulama kodu oluşturuldu. E-posta sunucusu ayarlı olmadığı için kodu aşağıda gösteriyoruz.`
      }
    >
      <VerifyEmailForm
        email={email}
        nextPath={nextPath}
        initiallySent={initiallySent}
        devCode={devCode}
      />
    </AuthShell>
  );
}
