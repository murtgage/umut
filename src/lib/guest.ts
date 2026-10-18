import "server-only";

import { prisma } from "@/lib/prisma";
import { levelFromXp } from "@/lib/scoring";

/**
 * Misafir (anonim) olarak biriken ilerlemeyi yeni kayıt olan hesaba taşır.
 *
 * Better Auth'un `anonymous` plugin'i, anonim kullanıcı başka bir yöntemle
 * giriş/kayıt yaptığında `onLinkAccount` çağırır ve sonrasında anonim kullanıcı
 * kaydını SİLER. `GameRun.userId` ve `PlayerStats.userId` ilişkileri
 * `onDelete: Cascade` olduğu için taşıma işlemi silmeden önce yapılmalıdır.
 */
export async function transferGuestProgress(
  guestUserId: string,
  targetUserId: string,
): Promise<void> {
  if (guestUserId === targetUserId) return;

  const guestRunCount = await prisma.gameRun.count({
    where: { userId: guestUserId },
  });

  if (guestRunCount === 0) return;

  await prisma.$transaction(async (tx) => {
    // 1) Turları (ve dolaylı olarak cevaplarını) yeni hesaba bağla.
    await tx.gameRun.updateMany({
      where: { userId: guestUserId },
      data: { userId: targetUserId },
    });

    // 2) İstatistikleri birleştir.
    const guestStats = await tx.playerStats.findUnique({
      where: { userId: guestUserId },
    });
    if (!guestStats) return;

    const targetStats = await tx.playerStats.findUnique({
      where: { userId: targetUserId },
    });

    const xp = (targetStats?.xp ?? 0) + guestStats.xp;
    const lastPlayedAt = laterOf(
      targetStats?.lastPlayedAt ?? null,
      guestStats.lastPlayedAt,
    );

    if (targetStats) {
      await tx.playerStats.update({
        where: { userId: targetUserId },
        data: {
          totalScore: targetStats.totalScore + guestStats.totalScore,
          gamesPlayed: targetStats.gamesPlayed + guestStats.gamesPlayed,
          gamesWon: targetStats.gamesWon + guestStats.gamesWon,
          questionsSeen: targetStats.questionsSeen + guestStats.questionsSeen,
          correctAnswers: targetStats.correctAnswers + guestStats.correctAnswers,
          bestScore: Math.max(targetStats.bestScore, guestStats.bestScore),
          longestStreak: Math.max(
            targetStats.longestStreak,
            guestStats.longestStreak,
          ),
          xp,
          level: levelFromXp(xp),
          lastPlayedAt,
        },
      });
    } else {
      await tx.playerStats.create({
        data: {
          userId: targetUserId,
          totalScore: guestStats.totalScore,
          gamesPlayed: guestStats.gamesPlayed,
          gamesWon: guestStats.gamesWon,
          questionsSeen: guestStats.questionsSeen,
          correctAnswers: guestStats.correctAnswers,
          bestScore: guestStats.bestScore,
          longestStreak: guestStats.longestStreak,
          xp,
          level: levelFromXp(xp),
          lastPlayedAt,
        },
      });
    }

    // Artık gereksiz: aynı userId için iki kayıt olamaz.
    await tx.playerStats.delete({ where: { userId: guestUserId } });
  });
}

function laterOf(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}
