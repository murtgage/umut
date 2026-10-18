import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Giriş yap",
  description: "Umut hesabınla giriş yap ve kaldığın yerden yarışmaya devam et.",
};

export default async function LoginPage(props: PageProps<"/giris">) {
  const session = await getSession();
  const searchParams = await props.searchParams;

  const rawNext = searchParams.next;
  const nextParam = Array.isArray(rawNext) ? rawNext[0] : rawNext;
  // Açık yönlendirme (open redirect) koruması: yalnızca site içi yollar.
  const safeNext =
    typeof nextParam === "string" && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/oyna";

  if (session) {
    redirect(safeNext);
  }

  return (
    <AuthShell
      title="Tekrar hoş geldin"
      description="Kullanıcı adınla ya da e-postanla devam et."
    >
      <LoginForm nextPath={safeNext} />
    </AuthShell>
  );
}
