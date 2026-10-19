import type { Metadata } from "next";

import { ModePicker } from "@/components/game/mode-picker";
import { Progress } from "@/components/ui/progress";
import { GUEST_RUN_LIMIT } from "@/lib/game-types";
import { getPlayerRank } from "@/lib/leaderboard";
import { prisma } from "@/lib/prisma";
import { startOfToday } from "@/lib/random";
import { accuracy, levelProgress } from "@/lib/scoring";
import { getUserFlags, requireVerifiedUser } from "@/lib/session";
import { formatNumber, formatPercent } from "@/lib/format";

export const metadata: Metadata = {
  title: "Oyna",
  description: "Hızlı tur, kategori turu veya günlük meydan okuma ile puan topla.",
};

export default async function PlayPage(props: PageProps<"/oyna">) {
  const session = await requireVerifiedUser("/oyna");
  const userId = session.user.id;
  const flags = await getUserFlags(userId);
  const searchParams = await props.searchParams;

  const rawError = searchParams.hata;
  const initialError = Array.isArray(rawError) ? rawError[0] : rawError;

  const [categories, stats, dailyRun, rank, completedRuns, wrongAnswers] =
    await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        color: true,
        icon: true,
        _count: { select: { questions: { where: { isActive: true } } } },
      },
    }),
    prisma.playerStats.findUnique({ where: { userId } }),
    prisma.gameRun.findFirst({
      where: {
        userId,
        mode: "DAILY",
        status: "COMPLETED",
        startedAt: { gte: startOfToday() },
      },
      select: { id: true, score: true },
    }),
    getPlayerRank(userId),
    prisma.gameRun.count({ where: { userId, status: "COMPLETED" } }),
    prisma.gameAnswer.findMany({
      where: {
        answered: true,
        isCorrect: false,
        run: { userId, status: "COMPLETED" },
      },
      select: { questionId: true },
      distinct: ["questionId"],
      take: 500,
    }),
  ]);

  const xp = stats?.xp ?? 0;
  const level = levelProgress(xp);
  const displayName = session.user.username ?? session.user.name;
  const isGuest = flags.isAnonymous;
  const guestRunsLeft = Math.max(0, GUEST_RUN_LIMIT - completedRuns);
  const totalQuestions = categories.reduce(
    (total, category) => total + category._count.questions,
    0,
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      {/* Karşılama paneli */}
      <section className="surface-card flex flex-col gap-5 p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-ink-muted">Hoş geldin,</p>
            <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {displayName}
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <MiniStat
              label="Sıralama"
              value={rank ? `#${formatNumber(rank)}` : "—"}
            />
            <MiniStat label="Seviye" value={String(level.level)} />
            <MiniStat
              label="Genel başarı"
              value={formatPercent(accuracy(stats?.correctAnswers ?? 0, stats?.questionsSeen ?? 0))}
            />
            <MiniStat label="Toplam puan" value={formatNumber(stats?.totalScore ?? 0)} />
          </div>
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

        {dailyRun ? (
          <p className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-warning">
            Bugünün meydan okumasını tamamladın:{" "}
            <strong className="tnum">{formatNumber(dailyRun.score)}</strong> puan.
            Yarın yeni sorular geliyor.
          </p>
        ) : null}
      </section>

      <ModePicker
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          color: category.color,
          icon: category.icon,
          questionCount: category._count.questions,
        }))}
        dailyPlayed={Boolean(dailyRun)}
        initialError={initialError ?? null}
        isGuest={isGuest}
        guestRunsLeft={guestRunsLeft}
        reviewCount={wrongAnswers.length}
      />

      <p className="text-center text-xs text-ink-faint">
        Soru bankasında toplam{" "}
        <span className="tnum text-ink-muted">{formatNumber(totalQuestions)}</span>{" "}
        soru var.
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-24 flex-col rounded-xl border border-line bg-canvas/40 px-3.5 py-2">
      <span className="text-[0.65rem] font-medium tracking-wide text-ink-faint uppercase">
        {label}
      </span>
      <span className="tnum text-base font-bold text-ink">{value}</span>
    </div>
  );
}
