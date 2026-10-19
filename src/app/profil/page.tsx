import type { Metadata } from "next";
import Link from "next/link";

import { startRunFormAction } from "@/app/oyun/actions";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  formatDuration,
  formatNumber,
  formatPercent,
  formatRelativeTime,
} from "@/lib/format";
import { MODE_INFO } from "@/lib/game-types";
import { getPlayerRank } from "@/lib/leaderboard";
import { prisma } from "@/lib/prisma";
import { accuracy, levelProgress } from "@/lib/scoring";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Profil",
  description: "İstatistiklerin, seviyen ve son turların.",
};

interface CategoryStat {
  id: string;
  name: string;
  color: string;
  total: number;
  correct: number;
}

/** Bir günü YYYY-AA-GG olarak anahtarlar — günlük seriyi hesaplamak için. */
function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Ardaşık oynanan gün sayısı. Bugün henüz oynanmadıysa seri dünden sayılır,
 * çünkü gün daha bitmemiş olabilir.
 */
function playStreakDays(days: Set<string>): number {
  if (days.size === 0) return 0;

  const cursor = new Date();
  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dayKey(cursor))) return 0;
  }

  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

interface Achievement {
  label: string;
  description: string;
  earned: boolean;
}

export default async function ProfilePage() {
  const session = await requireUser("/profil");
  const userId = session.user.id;

  const [stats, rank, runs, answers, playDays, perfectRuns] = await Promise.all([
    prisma.playerStats.findUnique({ where: { userId } }),
    getPlayerRank(userId),
    prisma.gameRun.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { finishedAt: "desc" },
      take: 8,
      select: {
        id: true,
        mode: true,
        score: true,
        correctCount: true,
        totalQuestions: true,
        bestStreak: true,
        durationMs: true,
        finishedAt: true,
        category: { select: { name: true } },
      },
    }),
    prisma.gameAnswer.findMany({
      where: { answered: true, run: { userId, status: "COMPLETED" } },
      select: {
        isCorrect: true,
        question: {
          select: { category: { select: { id: true, name: true, color: true } } },
        },
      },
    }),
    // Günlük seri için oynanan günler (son 400 tur yeter).
    prisma.gameRun.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { finishedAt: "desc" },
      take: 400,
      select: { finishedAt: true },
    }),
    // Kusursuz tur sayısı (10/10) — başarımlar için.
    prisma.gameRun.count({
      where: {
        userId,
        status: "COMPLETED",
        totalQuestions: 10,
        correctCount: 10,
      },
    }),
  ]);

  const displayName = session.user.username ?? session.user.name;
  const xp = stats?.xp ?? 0;
  const level = levelProgress(xp);

  // Ders bazlı başarı: cevapları bellekte toplarız (soru bankası ölçeği küçük).
  const byCategory = new Map<string, CategoryStat>();
  for (const answer of answers) {
    const category = answer.question.category;
    const current =
      byCategory.get(category.name) ??
      { id: category.id, name: category.name, color: category.color, total: 0, correct: 0 };
    current.total += 1;
    if (answer.isCorrect) current.correct += 1;
    byCategory.set(category.name, current);
  }
  const categoryStats = [...byCategory.values()].sort((a, b) => b.total - a.total);

  // Günlük seri: tur bitirilen günler.
  const playDaySet = new Set<string>();
  for (const run of playDays) {
    if (run.finishedAt) playDaySet.add(dayKey(run.finishedAt));
  }
  const streakDays = playStreakDays(playDaySet);

  // Zayıf ders: en az 5 soru çözülen dersler içinde isabeti en düşük olan.
  const weakest =
    [...categoryStats]
      .filter((category) => category.total >= 5)
      .sort((a, b) => accuracy(a.correct, a.total) - accuracy(b.correct, b.total))[0] ??
    null;

  const gamesPlayed = stats?.gamesPlayed ?? 0;
  const questionsSeen = stats?.questionsSeen ?? 0;
  const overallAccuracy = accuracy(stats?.correctAnswers ?? 0, questionsSeen);

  const achievements: Achievement[] = [
    { label: "İlk adım", description: "İlk turunu tamamla", earned: gamesPlayed >= 1 },
    { label: "Isınma", description: "10 tur tamamla", earned: gamesPlayed >= 10 },
    { label: "Arena müdavimi", description: "50 tur tamamla", earned: gamesPlayed >= 50 },
    { label: "Bilgi avcısı", description: "500 soru çöz", earned: questionsSeen >= 500 },
    { label: "Kütüphane", description: "2000 soru çöz", earned: questionsSeen >= 2000 },
    {
      label: "Keskin nişancı",
      description: "En az 100 soruda %80 isabet",
      earned: questionsSeen >= 100 && overallAccuracy >= 80,
    },
    {
      label: "Seri ustası",
      description: "Bir turda 10 doğru seri",
      earned: (stats?.longestStreak ?? 0) >= 10,
    },
    { label: "Kusursuz tur", description: "Bir turu tam doğru bitir", earned: perfectRuns >= 1 },
    { label: "Seviye 5", description: "5. seviyeye ulaş", earned: level.level >= 5 },
    { label: "Haftalık düzen", description: "7 gün üst üste oyna", earned: streakDays >= 7 },
  ];
  const earnedCount = achievements.filter((item) => item.earned).length;

  const headline = [
    { label: "Genel sıralama", value: rank ? `#${formatNumber(rank)}` : "—" },
    { label: "Toplam puan", value: formatNumber(stats?.totalScore ?? 0) },
    { label: "En iyi tur", value: formatNumber(stats?.bestScore ?? 0) },
    { label: "İsabet", value: formatPercent(accuracy(stats?.correctAnswers ?? 0, stats?.questionsSeen ?? 0)) },
    { label: "Tur sayısı", value: formatNumber(stats?.gamesPlayed ?? 0) },
    { label: "En uzun seri", value: String(stats?.longestStreak ?? 0) },
  ];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      {/* Kimlik kartı */}
      <Card className="animate-rise">
        <CardContent className="flex flex-col gap-6 pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar name={displayName} image={session.user.image} size="lg" />
            <div className="flex-1">
              <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
                {displayName}
              </h1>
              <p className="text-sm text-ink-muted">{session.user.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone="brand">Seviye {level.level}</Badge>
                <Badge tone="neutral">
                  {formatNumber(stats?.questionsSeen ?? 0)} soru çözüldü
                </Badge>
                <Badge tone={streakDays >= 3 ? "gold" : "neutral"}>
                  {streakDays > 0
                    ? `🔥 ${streakDays} günlük seri`
                    : "Günlük seri yok"}
                </Badge>
                {stats?.lastPlayedAt ? (
                  <span className="text-xs text-ink-faint">
                    Son oyun {formatRelativeTime(stats.lastPlayedAt)}
                  </span>
                ) : null}
              </div>
            </div>
            <Link href="/oyna" className={buttonVariants({ size: "lg" })}>
              Tur başlat
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>
                Seviye {level.level} → {level.level + 1}
              </span>
              <span className="tnum">
                {formatNumber(level.into)} / {formatNumber(level.need)} XP
              </span>
            </div>
            <Progress value={level.percent} label="Seviye ilerlemesi" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {headline.map((item) => (
              <div
                key={item.label}
                className="flex flex-col rounded-xl border border-line bg-canvas/40 px-3.5 py-2.5"
              >
                <span className="text-[0.65rem] font-medium tracking-wide text-ink-faint uppercase">
                  {item.label}
                </span>
                <span className="tnum text-lg font-bold text-ink">{item.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Zayıf ders — tek tıkla tekrar tur */}
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <h2 className="text-base font-semibold text-ink">
              Odaklanman gereken ders
            </h2>

            {weakest ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium text-ink">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: weakest.color }}
                      aria-hidden
                    />
                    {weakest.name}
                  </span>
                  <span className="tnum text-xs text-ink-muted">
                    {weakest.correct}/{weakest.total} ·{" "}
                    {formatPercent(accuracy(weakest.correct, weakest.total))}
                  </span>
                </div>
                <p className="text-xs text-ink-faint">
                  En düşük isabet oranın bu derste. Kısa bir tekrar turuyla
                  toparlayabilirsin.
                </p>
                <form action={startRunFormAction}>
                  <input type="hidden" name="mode" value="CATEGORY" />
                  <input type="hidden" name="categoryId" value={weakest.id} />
                  <Button type="submit" variant="secondary" className="w-full">
                    {weakest.name} dersinden tur başlat
                  </Button>
                </form>
              </>
            ) : (
              <p className="py-4 text-sm text-ink-muted">
                Birkaç tur oynadıktan sonra en çok zorlandığın dersi burada
                göstereceğiz.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Başarımlar */}
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">
                Başarımların
              </h2>
              <span className="tnum text-xs text-ink-faint">
                {earnedCount}/{achievements.length}
              </span>
            </div>

            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {achievements.map((item) => (
                <li
                  key={item.label}
                  className={cn(
                    "flex items-start gap-2 rounded-xl border px-3 py-2",
                    item.earned
                      ? "border-brand/40 bg-brand/10"
                      : "border-line bg-canvas/40 opacity-70",
                  )}
                >
                  <span aria-hidden className="text-sm">
                    {item.earned ? "🏅" : "🔒"}
                  </span>
                  <span className="flex flex-col">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        item.earned ? "text-ink" : "text-ink-muted",
                      )}
                    >
                      {item.label}
                    </span>
                    <span className="text-xs text-ink-faint">
                      {item.description}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Ders bazlı başarı */}
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <h2 className="text-base font-semibold text-ink">Ders bazlı başarın</h2>

            {categoryStats.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-muted">
                Henüz tamamlanmış turun yok.
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {categoryStats.map((category) => {
                  const percent = accuracy(category.correct, category.total);
                  return (
                    <li key={category.name} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 font-medium text-ink">
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: category.color }}
                            aria-hidden
                          />
                          {category.name}
                        </span>
                        <span className="tnum text-xs text-ink-muted">
                          {category.correct}/{category.total} · {formatPercent(percent)}
                        </span>
                      </div>
                      <Progress value={percent / 100} label={`${category.name} başarısı`} />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Son turlar */}
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <h2 className="text-base font-semibold text-ink">Son turların</h2>

            {runs.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-muted">
                İlk turunu oynadığında burada görünecek.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {runs.map((run) => (
                  <li key={run.id} className="flex items-center gap-3 py-3">
                    <div className="flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium text-ink">
                        {MODE_INFO[run.mode as keyof typeof MODE_INFO]?.label ?? run.mode}
                        {run.category ? (
                          <span className="text-xs text-ink-faint">
                            · {run.category.name}
                          </span>
                        ) : null}
                      </p>
                      <p className="tnum text-xs text-ink-faint">
                        {run.correctCount}/{run.totalQuestions} doğru · seri{" "}
                        {run.bestStreak} · {formatDuration(run.durationMs)}
                        {run.finishedAt
                          ? ` · ${formatRelativeTime(run.finishedAt)}`
                          : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "tnum text-base font-bold",
                        run.correctCount === run.totalQuestions
                          ? "text-gold"
                          : "text-brand-soft",
                      )}
                    >
                      {formatNumber(run.score)}
                    </span>
                    <Link
                      href={`/oyun/${run.id}/sonuc`}
                      className="rounded-md px-2 py-1 text-xs text-ink-faint transition hover:text-brand-soft"
                    >
                      Detay
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
