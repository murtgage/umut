import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "./auth";
import { prisma } from "./prisma";

/**
 * Geçerli isteğin oturumu. React `cache` sayesinde aynı istek içinde birden
 * fazla çağrı tek sorguya iner.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export type SessionResult = Awaited<ReturnType<typeof getSession>>;
export type SessionUser = NonNullable<SessionResult>["user"];

export interface UserFlags {
  emailVerified: boolean;
  /** Üye olmadan oynayan misafir oturumu mu? */
  isAnonymous: boolean;
}

/**
 * Oturum nesnesinde yer almayan bayrakları tek sorguda toplar.
 * React `cache` ile aynı istek içinde tekrarlanan çağrılar birleşir.
 */
export const getUserFlags = cache(async (userId: string): Promise<UserFlags> => {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true, isAnonymous: true },
  });

  return {
    emailVerified: row?.emailVerified ?? false,
    isAnonymous: row?.isAnonymous ?? false,
  };
});

/** Oturum yoksa giriş sayfasına yönlendirir. */
export async function requireUser(nextPath?: string) {
  const session = await getSession();
  if (!session) {
    redirect(nextPath ? `/giris?next=${encodeURIComponent(nextPath)}` : "/giris");
  }
  return session;
}

/**
 * Oyuna girebilmek için e-postası doğrulanmış (veya misafir) bir oturum ister.
 * Doğrulanmamış hesaplar `/dogrula` sayfasına yönlendirilir.
 */
export async function requireVerifiedUser(nextPath?: string) {
  const session = await requireUser(nextPath);
  const flags = await getUserFlags(session.user.id);

  if (!flags.emailVerified && !flags.isAnonymous) {
    const target = nextPath ?? "/oyna";
    redirect(`/dogrula?next=${encodeURIComponent(target)}`);
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

/**
 * Sunucu eylemleri için: oynayabilen (doğrulanmış ya da misafir) bir oturum
 * ister. Server Action'lar ayrı rotalar olmadığı için proxy'ye güvenilmez.
 */
export async function requirePlayableSessionOrThrow() {
  const session = await requireSessionOrThrow();
  const flags = await getUserFlags(session.user.id);

  if (!flags.emailVerified && !flags.isAnonymous) {
    throw new Error("EMAIL_NOT_VERIFIED");
  }

  return { session, flags };
}
