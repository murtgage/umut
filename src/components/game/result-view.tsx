import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDuration, formatNumber, formatPercent } from "@/lib/format";
import { MODE_INFO, type RunSummary } from "@/lib/game-types";
import { levelProgress } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export function ResultView({
  summary,
  rank,
}: {
  summary: RunSummary;
  rank: number | null;
}) {
  const mode = MODE_INFO[summary.mode];
  const leveledUp = summary.levelAfter > summary.levelBefore;
  const progress = levelProgress(summary.totalXp);

  const stats = [
    { label: "Doğru", value: String(summary.correctCount), tone: "success" as const },
    { label: "Yanlış", value: String(summary.wrongCount), tone: "danger" as const },
    { label: "Boş", value: String(summary.skippedCount), tone: "plain" as const },
    { label: "En uzun seri", value: String(summary.bestStreak), tone: "warning" as const },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Sonuç kartı */}
      <Card className="animate-rise overflow-hidden">
        <div className="bg-gradient-to-br from-brand-deep/60 via-brand/25 to-accent/15 px-6 pt-8 pb-6 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-brand-soft uppercase">
                {mode.label}
                {summary.categoryName ? ` · ${summary.categoryName}` : ""}
              </p>
              <p
                className={cn(
                  "mt-2 text-2xl font-bold tracking-tight sm:text-3xl",
                  summary.grade.tone,
                )}
              >
                {summary.grade.label}
              </p>
              {summary.isNewBest ? (
                <p className="mt-1 text-sm text-gold">
                  🏆 Yeni kişisel rekorun!
                </p>
              ) : null}
            </div>

            <div className="text-right">
              <p className="text-xs tracking-wide text-ink-muted uppercase">
                Toplam puan
              </p>
              <p className="tnum text-4xl font-extrabold text-ink sm:text-5xl">
                {formatNumber(summary.score)}
              </p>
            </div>
          </div>
        </div>

        <CardContent className="flex flex-col gap-6 pt-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col rounded-xl border border-line bg-canvas/40 px-3.5 py-2.5"
              >
                <span className="text-[0.65rem] font-medium tracking-wide text-ink-faint uppercase">
                  {stat.label}
                </span>
                <span
                  className={cn(
                    "tnum text-xl font-bold",
                    stat.tone === "success" && "text-success",
                    stat.tone === "danger" && "text-danger",
                    stat.tone === "warning" && "text-warning",
                    stat.tone === "plain" && "text-ink",
                  )}
                >
                  {stat.value}
                </span>
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <InfoTile label="İsabet" value={formatPercent(summary.accuracy)} />
            <InfoTile label="Süre" value={formatDuration(summary.durationMs)} />
            <InfoTile
              label="Genel sıralama"
              value={rank ? `#${formatNumber(rank)}` : "—"}
            />
          </div>

          {/* XP ve seviye */}
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-elevated/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-ink">
                Seviye {summary.levelAfter}
                {leveledUp ? (
                  <Badge tone="gold" className="ml-2 align-middle">
                    Seviye atladın! 🎉
                  </Badge>
                ) : null}
              </span>
              <span className="tnum text-sm text-brand-soft">
                +{formatNumber(summary.xpGained)} XP
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <Progress value={progress.percent} label="Seviye ilerlemesi" />
              <p className="tnum text-xs text-ink-faint">
                {formatNumber(progress.into)} / {formatNumber(progress.need)} XP ·
                Toplam {formatNumber(summary.totalScore)} puan
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/oyna" className={buttonVariants({ size: "lg" })}>
              Yeni tur başlat
            </Link>
            <Link
              href="/siralama"
              className={buttonVariants({ variant: "secondary", size: "lg" })}
            >
              Sıralamayı gör
            </Link>
            <Link
              href="/profil"
              className={buttonVariants({ variant: "ghost", size: "lg" })}
            >
              Profilim
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Yanlış / boş soruların tekrarı */}
      {summary.missed.length > 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <h2 className="text-base font-semibold text-ink">
              Tekrar etmen gereken sorular ({summary.missed.length})
            </h2>

            <ul className="flex flex-col gap-4">
              {summary.missed.map((question) => (
                <li
                  key={question.position}
                  className="flex flex-col gap-2 rounded-xl border border-line bg-canvas/40 p-4"
                >
                  <div className="flex items-center gap-2">
                    <span className="tnum grid size-6 place-items-center rounded-md border border-line-strong bg-elevated text-xs font-bold text-ink-muted">
                      {question.position + 1}
                    </span>
                    {question.selectedOption === null ? (
                      <Badge tone="warning">Boş bırakıldı</Badge>
                    ) : (
                      <Badge tone="danger">
                        Senin cevabın: {question.selectedOption}
                      </Badge>
                    )}
                    <Badge tone="success">
                      Doğru: {question.correctOption}
                    </Badge>
                  </div>

                  <p className="text-sm leading-relaxed text-ink">
                    {question.text}
                  </p>

                  {question.explanation ? (
                    <p className="text-sm leading-relaxed text-ink-muted">
                      {question.explanation}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-2xl">🎯</p>
            <p className="mt-2 font-semibold text-ink">
              Bu turda hiç hata yapmadın!
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              Zorluk seviyesini yükseltmenin zamanı gelmiş olabilir.
            </p>
          </CardContent>
        </Card>
      )}

    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-xl border border-line bg-canvas/40 px-3.5 py-2.5">
      <span className="text-[0.65rem] font-medium tracking-wide text-ink-faint uppercase">
        {label}
      </span>
      <span className="tnum text-lg font-bold text-ink">{value}</span>
    </div>
  );
}
