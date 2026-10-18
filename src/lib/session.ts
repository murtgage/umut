import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "./auth";

/**
 * Geçerli isteğin oturumu. React `cache` sayesinde aynı istek içinde birden
 * fazla çağrı tek sorguya iner.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export type SessionResult = Awaited<ReturnType<typeof getSession>>;
export type SessionUser = NonNullable<SessionResult>["user"];

/** Oturum yoksa giriş sayfasına yönlendirir. */
export async function requireUser(nextPath?: string) {
  const session = await getSession();
  if (!session) {
    redirect(nextPath ? `/giris?next=${encodeURIComponent(nextPath)}` : "/giris");
  }
  return session;
}

/**
 * Yönetici yetkisi ister. Yetki kontrolü proxy'ye BIRAKILMAZ; her sunucu
 * eylemi / route handler kendi kontrolünü yapar.
 */
export async function requireAdmin() {
  const session = await requireUser();
  if (session.user.role !== "ADMIN") {
    redirect("/oyna");
  }
  return session;
}

/** Sunucu eylemleri (Server Actions) için oturum zorunlu kılan yardımcı. */
export async function requireSessionOrThrow() {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}
