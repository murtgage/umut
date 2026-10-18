import { prisma } from "@/lib/prisma";
import { accuracy } from "@/lib/scoring";
import { levelFromXp } from "@/lib/scoring";

export interface LeaderboardRow {
  rank: number;
  userId: string;
  name: string;
  username: string | null;
  image: string | null;
  totalScore: number;
  gamesPlayed: number;
  correctAnswers: number;
  questionsSeen: number;
  /** Yüzde (0-100) */
  accuracy: number;
  level: number;
  bestScore: number;
  longestStreak: number;
}

/**
 * Sıralama ölçütü: toplam puan → doğru cevap sayısı → daha erken ulaşan.
 * Bu üçlü, eşit puanlı oyuncuları deterministik biçimde ayırır.
 */
const RANK_ORDER = [
  { totalScore: "desc" },
  { correctAnswers: "desc" },
  { updatedAt: "asc" },
] as const;

function toRow(
  stats: {
    userId: string;
    totalScore: number;
    gamesPlayed: number;
    correctAnswers: number;
    questionsSeen: number;
    bestScore: number;
    longestStreak: number;
    xp: number;
    user: { name: string; username: string | null; image: string | null };
  },
  rank: number,
): LeaderboardRow {
  return {
    rank,
    userId: stats.userId,
    name: stats.user.username ?? stats.user.name,
    username: stats.user.username,
    image: stats.user.image,
    totalScore: stats.totalScore,
    gamesPlayed: stats.gamesPlayed,
    correctAnswers: stats.correctAnswers,
    questionsSeen: stats.questionsSeen,
    accuracy: accuracy(stats.correctAnswers, stats.questionsSeen),
    level: levelFromXp(stats.xp),
    bestScore: stats.bestScore,
    longestStreak: stats.longestStreak,
  };
}

export async function getGlobalLeaderboard(options?: {
  limit?: number;
  offset?: number;
}): Promise<LeaderboardRow[]> {
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);
  const offset = Math.max(options?.offset ?? 0, 0);

  const rows = await prisma.playerStats.findMany({
    // Misafir (anonim) oyuncular genel sıralamaya girmez.
    where: { gamesPlayed: { gt: 0 }, user: { isAnonymous: false } },
    orderBy: [...RANK_ORDER],
    skip: offset,
    take: limit,
    select: {
      userId: true,
      totalScore: true,
      gamesPlayed: true,
      correctAnswers: true,
      questionsSeen: true,
      bestScore: true,
      longestStreak: true,
      xp: true,
      user: { select: { name: true, username: true, image: true } },
    },
  });

  return rows.map((row, index) => toRow(row, offset + index + 1));
}

export async function countRankedPlayers(): Promise<number> {
  return prisma.playerStats.count({
    where: { gamesPlayed: { gt: 0 }, user: { isAnonymous: false } },
  });
}

/** Bir oyuncunun genel sıralamadaki yeri (1 tabanlı). */
export async function getPlayerRank(userId: string): Promise<number | null> {
  const stats = await prisma.playerStats.findUnique({
    where: { userId },
    select: {
      totalScore: true,
      correctAnswers: true,
      updatedAt: true,
      gamesPlayed: true,
      user: { select: { isAnonymous: true } },
    },
  });

  if (!stats || stats.gamesPlayed === 0) return null;

  // Misafir oyuncular sıralamaya dahil edilmez.
  if (stats.user.isAnonymous) return null;

  const ahead = await prisma.playerStats.count({
    where: {
      gamesPlayed: { gt: 0 },
      user: { isAnonymous: false },
      OR: [
        { totalScore: { gt: stats.totalScore } },
        {
          totalScore: stats.totalScore,
          correctAnswers: { gt: stats.correctAnswers },
        },
        {
          totalScore: stats.totalScore,
          correctAnswers: stats.correctAnswers,
          updatedAt: { lt: stats.updatedAt },
        },
      ],
    },
  });

  return ahead + 1;
}
