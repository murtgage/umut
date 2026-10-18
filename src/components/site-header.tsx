import { SiteNav, type NavUser } from "@/components/site-nav";
import { levelFromXp } from "@/lib/scoring";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

/** Sunucu tarafında oturum + istatistikleri başlık için hazırlar. */
export async function SiteHeader() {
  const session = await getSession();

  let user: NavUser | null = null;

  if (session) {
    const stats = await prisma.playerStats.findUnique({
      where: { userId: session.user.id },
      select: { xp: true, totalScore: true },
    });

    const xp = stats?.xp ?? 0;

    user = {
      id: session.user.id,
      name: session.user.name,
      username: session.user.username ?? null,
      image: session.user.image ?? null,
      isAdmin: session.user.role === "ADMIN",
      level: levelFromXp(xp),
      totalScore: stats?.totalScore ?? 0,
    };
  }

  return <SiteNav user={user} />;
}
