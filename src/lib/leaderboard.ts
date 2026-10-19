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

/** Haftalık sıralamanın kapsadığı pencere: son 7 gün. */
const WEEK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Son 7 günün başlangıcı. */
export function weeklySince(now: Date = new Date()): Date {
  return new Date(now.getTime() - WEEK_WINDOW_MS);
}

export interface WeeklyRow {
  rank: number;
  userId: string;
  name: string;
  username: string | null;
  image: string | null;
  weekScore: number;
  gamesPlayed: number;
  correctAnswers: number;
  questionsSeen: number;
  accuracy: number;
  bestStreak: number;
}

interface WeeklyAggregate {
  userId: string;
  weekScore: number;
  gamesPlayed: number;
  correctAnswers: number;
  questionsSeen: number;
  bestStreak: number;
}

/**
 * Son 7 günde tamamlanan turları oyuncu bazında toplar ve sıralar.
 * Ölçüt: haftalık toplam puan → haftalık doğru sayısı → haftanın en iyi serisi.
 * Misafir (anonim) oyuncular dahil edilmez.
 */
async function weeklyAggregates(since: Date): Promise<WeeklyAggregate[]> {
  const grouped = await prisma.gameRun.groupBy({
    by: ["userId"],
    where: {
      status: "COMPLETED",
      finishedAt: { gte: since },
      user: { isAnonymous: false },
    },
    _sum: { score: true, correctCount: true, totalQuestions: true },
    _max: { bestStreak: true },
    _count: { _all: true },
  });

  const list: WeeklyAggregate[] = grouped.map((row) => ({
    userId: row.userId,
    weekScore: row._sum.score ?? 0,
    gamesPlayed: row._count._all,
    correctAnswers: row._sum.correctCount ?? 0,
    questionsSeen: row._sum.totalQuestions ?? 0,
    bestStreak: row._max.bestStreak ?? 0,
  }));

  list.sort((a, b) => {
    if (b.weekScore !== a.weekScore) return b.weekScore - a.weekScore;
    if (b.correctAnswers !== a.correctAnswers) {
      return b.correctAnswers - a.correctAnswers;
    }
    if (b.bestStreak !== a.bestStreak) return b.bestStreak - a.bestStreak;
    return a.userId.localeCompare(b.userId);
  });

  return list;
}

export async function getWeeklyLeaderboard(options?: {
  limit?: number;
  offset?: number;
}): Promise<WeeklyRow[]> {
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);
  const offset = Math.max(options?.offset ?? 0, 0);

  const aggregates = await weeklyAggregates(weeklySince());
  const page = aggregates.slice(offset, offset + limit);

  const users = await prisma.user.findMany({
    where: { id: { in: page.map((row) => row.userId) } },
    select: { id: true, name: true, username: true, image: true },
  });
  const userById = new Map(users.map((user) => [user.id, user]));

  return page.map((row, index) => {
    const user = userById.get(row.userId);
    return {
      rank: offset + index + 1,
      userId: row.userId,
      name: user?.username ?? user?.name ?? "Oyuncu",
      username: user?.username ?? null,
      image: user?.image ?? null,
      weekScore: row.weekScore,
      gamesPlayed: row.gamesPlayed,
      correctAnswers: row.correctAnswers,
      questionsSeen: row.questionsSeen,
      accuracy: accuracy(row.correctAnswers, row.questionsSeen),
      bestStreak: row.bestStreak,
    };
  });
}

export async function countWeeklyRankedPlayers(): Promise<number> {
  const aggregates = await weeklyAggregates(weeklySince());
  return aggregates.length;
}

/** Bir oyuncunun haftalık sıralamadaki yeri (1 tabanlı). */
export async function getWeeklyStanding(userId: string): Promise<{
  rank: number;
  weekScore: number;
  gamesPlayed: number;
  bestStreak: number;
} | null> {
  const aggregates = await weeklyAggregates(weeklySince());
  const index = aggregates.findIndex((row) => row.userId === userId);
  if (index === -1) return null;

  const row = aggregates[index];
  return {
    rank: index + 1,
    weekScore: row.weekScore,
    gamesPlayed: row.gamesPlayed,
    bestStreak: row.bestStreak,
  };
}
