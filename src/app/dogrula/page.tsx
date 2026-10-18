import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";
import { extractOtp, readDevOutbox } from "@/lib/mail";
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

  // Geliştirmede SMTP yapılandırılmamışsa kodu ekranda da gösterelim;
  // böylece e-posta sunucusu olmadan akış test edilebilir.
  let devCode: string | null = null;
  if (process.env.NODE_ENV !== "production") {
    const [entry] = await readDevOutbox(email, 1);
    devCode = entry ? extractOtp(entry.text) : null;
  }

  return (
    <AuthShell
      title="E-postanı doğrula"
      description={`${email} adresine 6 haneli bir doğrulama kodu gönderdik. Kodu girerek hesabını aktifleştir.`}
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
