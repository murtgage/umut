import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Kayıt ol",
  description:
    "Ücretsiz hesap oluştur; KPSS sorularını çöz, puan topla ve sıralamada yüksel.",
};

export default async function RegisterPage(props: PageProps<"/kayit">) {
  const session = await getSession();
  const searchParams = await props.searchParams;

  const rawNext = searchParams.next;
  const nextParam = Array.isArray(rawNext) ? rawNext[0] : rawNext;
  const safeNext =
    typeof nextParam === "string" && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/oyna";

  if (session) {
    redirect(safeNext);
  }

  return (
    <AuthShell
      title="Aramıza katıl"
      description="30 saniyede hesabını oluştur, ilk turun hemen başlasın."
    >
      <RegisterForm nextPath={safeNext} />
    </AuthShell>
  );
}
