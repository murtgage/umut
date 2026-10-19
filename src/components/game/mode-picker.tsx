"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { startDuelAction, startRunAction } from "@/app/oyun/actions";
import { CategoryIcon } from "@/components/category-icon";
import { Button, buttonVariants } from "@/components/ui/button";
import { EXAM_TYPES, examTypeBySlug } from "@/lib/exam-types";
import { formatNumber } from "@/lib/format";
import type { ResumableRun, RunMode } from "@/lib/game-types";
import {
  DIFFICULTY_CHOICES,
  GUEST_RUN_LIMIT,
  MODE_INFO,
  QUESTION_COUNT_CHOICES,
} from "@/lib/game-types";
import { cn } from "@/lib/utils";

export interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string | null;
  questionCount: number;
}

/** Bir tur başlatmak için gereken en az soru sayısı (sunucudaki `QUESTIONS_PER_RUN` ile aynı). */
const QUESTIONS_PER_RUN = 10;

export function ModePicker({
  categories,
  dailyPlayed,
  initialError,
  isGuest = false,
  guestRunsLeft = null,
  reviewCount = 0,
  resumableRuns = [],
}: {
  categories: CategoryOption[];
  dailyPlayed: boolean;
  initialError?: string | null;
  isGuest?: boolean;
  guestRunsLeft?: number | null;
  reviewCount?: number;
  resumableRuns?: ResumableRun[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [examSlug, setExamSlug] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState<number>(QUESTIONS_PER_RUN);
  const [difficulty, setDifficulty] = useState<number>(0);

  const guestBlocked = isGuest && guestRunsLeft !== null && guestRunsLeft <= 0;

  const categoryBySlug = useMemo(
    () => new Map(categories.map((category) => [category.slug, category])),
    [categories],
  );

  const exam = examTypeBySlug(examSlug);

  const examCategories = useMemo(() => {
    if (!exam || exam.categorySlugs.length === 0) return [];
    return exam.categorySlugs
      .map((slug) => categoryBySlug.get(slug))
      .filter((category): category is CategoryOption => Boolean(category));
  }, [exam, categoryBySlug]);

  function categoriesOf(categorySlugs: string[]): CategoryOption[] {
    if (categorySlugs.length === 0) return categories;
    return categorySlugs
      .map((slug) => categoryBySlug.get(slug))
      .filter((category): category is CategoryOption => Boolean(category));
  }

  function questionCountOf(categorySlugs: string[]): number {
    return categoriesOf(categorySlugs).reduce(
      (total, category) => total + category.questionCount,
      0,
    );
  }

  function launch(
    mode: RunMode,
    options: { categoryId?: string; examType?: string; key?: string } = {},
  ) {
    if (guestBlocked) {
      setError(
        "Üye olmadan oynayabileceğin tur hakkın doldu. Ücretsiz kayıt olup kaldığın yerden devam et!",
      );
      return;
    }

    setError(null);
    setBusyKey(options.key ?? mode);

    startTransition(async () => {
      const result = await startRunAction({
        mode,
        categoryId: options.categoryId ?? null,
        examType: options.examType ?? null,
        questionCount,
        difficulty,
      });

      if (!result.ok) {
        setError(result.error);
        setBusyKey(null);
        return;
      }

      router.push(`/oyun/${result.data.runId}`);
    });
  }

  const examBusy = busyKey === "EXAM" && pending;

  return (
    <div className="flex flex-col gap-8">
      {isGuest ? (
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm",
            guestBlocked
              ? "border-danger/30 bg-danger/5 text-danger"
              : "border-brand/25 bg-brand/5 text-ink-muted",
          )}
        >
          <span>
            {guestBlocked ? (
              <>
                Misafir deneme hakkın doldu ({GUEST_RUN_LIMIT} tur). İlerlemeni
                kaydetmek için ücretsiz kayıt ol.
              </>
            ) : (
              <>
                Misafir olarak oynuyorsun — kalan tur hakkın{" "}
                <strong className="tnum text-ink">{guestRunsLeft}</strong> /{" "}
                {GUEST_RUN_LIMIT}. Kayıt olursan puanların sıralamaya işlenir.
              </>
            )}
          </span>
          <Link href="/kayit" className={buttonVariants({ size: "sm" })}>
            Ücretsiz kayıt ol
          </Link>
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      {resumableRuns.length > 0 ? (
        <section className="surface-card flex flex-col gap-3 p-4 sm:p-5">
          <div>
            <p className="text-sm font-semibold text-ink">Yarım kalan turun</p>
            <p className="text-xs text-ink-muted">
              Kaldığın yerden devam et, puanların kaçmasın.
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {resumableRuns.map((run) => {
              const modeLabel = MODE_INFO[run.mode]?.label ?? "Tur";
              const title = run.categoryName ?? modeLabel;
              return (
                <li
                  key={run.runId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-canvas/40 px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{title}</p>
                    <p className="text-xs text-ink-muted">
                      {title !== modeLabel ? `${modeLabel} · ` : ""}
                      <span className="tnum">
                        {run.answeredCount}/{run.totalQuestions}
                      </span>{" "}
                      soru
                    </p>
                  </div>
                  <Link
                    href={`/oyun/${run.runId}`}
                    className={buttonVariants({ size: "sm" })}
                  >
                    Devam et
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* 1. adım — sınav türü */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            Hangi sınavdan çalışıyorsun?
          </h2>
          <span className="hidden text-xs text-ink-faint sm:inline">
            Bölümler farklı soru havuzlarıdır
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {EXAM_TYPES.map((type) => {
            const active = type.slug === examSlug;

            return (
              <button
                key={type.slug}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setError(null);
                  setExamSlug((current) =>
                    current === type.slug ? null : type.slug,
                  );
                }}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition",
                  "border-line bg-surface hover:border-brand/40 hover:bg-elevated/60",
                  active && "border-brand bg-brand/5 ring-1 ring-brand/30",
                )}
              >
                <span className="text-xl leading-none" aria-hidden>
                  {type.icon}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span
                    className={cn(
                      "truncate text-sm font-semibold",
                      active ? "text-brand-soft" : "text-ink",
                    )}
                  >
                    {type.name}
                  </span>
                  <span className="tnum text-xs text-ink-faint">
                    {formatNumber(questionCountOf(type.categorySlugs))} soru
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. adım — ders / karma tur */}
      {exam ? (
        <section className="animate-rise flex flex-col gap-4">
          <div className="surface-card flex flex-col gap-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">
                  {exam.name}
                  {exam.categorySlugs.length === 0
                    ? " · bütün dersler"
                    : ""}
                </p>
                <p className="text-xs text-ink-muted">
                  {exam.categorySlugs.length === 0
                    ? `Tüm derslerden rastgele ${questionCount} soru`
                    : `Seçtiğin bölümün derslerinden rastgele ${questionCount} soru`}
                </p>
              </div>

              <Button
                size="lg"
                disabled={pending || guestBlocked}
                onClick={() =>
                  launch("EXAM", { examType: exam.slug, key: "EXAM" })
                }
              >
                {examBusy ? "Hazırlanıyor…" : `Karma ${questionCount} soru ile başla`}
              </Button>
            </div>

            {/* Tur uzunluğu ve zorluk — tek satırda, gürültüsüz */}
            <div className="flex flex-col gap-3 border-t border-line pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium tracking-wide text-ink-faint uppercase">
                  Soru
                </span>
                {QUESTION_COUNT_CHOICES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={questionCount === option}
                    disabled={pending || guestBlocked}
                    onClick={() => setQuestionCount(option)}
                    className={cn(
                      "tnum rounded-lg border px-3 py-1 text-sm font-medium transition disabled:opacity-50",
                      questionCount === option
                        ? "border-brand/50 bg-brand/10 text-brand-soft"
                        : "border-line bg-canvas/40 text-ink-muted hover:bg-elevated/60 hover:text-ink",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium tracking-wide text-ink-faint uppercase">
                  Zorluk
                </span>
                {DIFFICULTY_CHOICES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={difficulty === option.value}
                    disabled={pending || guestBlocked}
                    onClick={() => setDifficulty(option.value)}
                    className={cn(
                      "rounded-lg border px-3 py-1 text-sm font-medium transition disabled:opacity-50",
                      difficulty === option.value
                        ? "border-brand/50 bg-brand/10 text-brand-soft"
                        : "border-line bg-canvas/40 text-ink-muted hover:bg-elevated/60 hover:text-ink",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {examCategories.length > 0 ? (
              <div className="flex flex-col gap-2.5 border-t border-line pt-4">
                <p className="text-xs text-ink-faint">
                  Ya da tek bir derse odaklan
                </p>
                <div className="flex flex-wrap gap-2">
                  {examCategories.map((category) => {
                    const isBusy = busyKey === category.id && pending;
                    const enough = category.questionCount >= QUESTIONS_PER_RUN;

                    return (
                      <button
                        key={category.id}
                        type="button"
                        disabled={pending || !enough || guestBlocked}
                        onClick={() =>
                          launch("CATEGORY", {
                            categoryId: category.id,
                            key: category.id,
                          })
                        }
                        className={cn(
                          "flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm transition",
                          "hover:border-brand/40 hover:bg-elevated/60",
                          (!enough || pending || guestBlocked) &&
                            "cursor-not-allowed opacity-50",
                        )}
                      >
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: category.color }}
                          aria-hidden
                        />
                        <span className="font-medium text-ink">
                          {category.name}
                        </span>
                        <span className="tnum text-xs text-ink-faint">
                          {isBusy
                            ? "…"
                            : enough
                              ? category.questionCount
                              : `${category.questionCount} (yetersiz)`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setExamSlug(null)}
            className="self-start text-xs text-ink-faint underline underline-offset-2 transition hover:text-ink-muted"
          >
            Sınav türünü değiştir
          </button>
        </section>
      ) : (
        <p className="rounded-xl border border-dashed border-line px-4 py-3 text-sm text-ink-faint">
          Devam etmek için yukarıdan bir sınav türü seç.
        </p>
      )}

      {/* Diğer modlar — tek satır, gürültüsüz */}
      <section className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <span className="text-xs font-medium tracking-wide text-ink-faint uppercase">
          Diğer
        </span>

        <Button
          variant="outline"
          size="sm"
          disabled={pending || guestBlocked || reviewCount < 1}
          onClick={() => launch("REVIEW", { key: "REVIEW" })}
          title={
            reviewCount < 1
              ? "Henüz yanlış yaptığın soru yok"
              : `${reviewCount} yanlış soru tekrar çözülebilir`
          }
        >
          {busyKey === "REVIEW" && pending
            ? "Hazırlanıyor…"
            : reviewCount < 1
              ? `${MODE_INFO.REVIEW.label} · yok`
              : `${MODE_INFO.REVIEW.label} · ${reviewCount}`}
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={dailyPlayed || pending || guestBlocked}
          onClick={() => launch("DAILY", { key: "DAILY" })}
        >
          {busyKey === "DAILY" && pending
            ? "Hazırlanıyor…"
            : dailyPlayed
              ? `${MODE_INFO.DAILY.label} · bugün tamamlandı`
              : MODE_INFO.DAILY.label}
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={pending || guestBlocked}
          onClick={() => {
            if (guestBlocked) {
              setError(
                "Üye olmadan oynayabileceğin tur hakkın doldu. Ücretsiz kayıt olup kaldığın yerden devam et!",
              );
              return;
            }

            setError(null);
            setBusyKey("DUEL");

            startTransition(async () => {
              const result = await startDuelAction({ questionCount, difficulty });

              if (!result.ok) {
                setError(result.error);
                setBusyKey(null);
                return;
              }

              router.push(`/duello/${result.data.duelId}`);
            });
          }}
        >
          {busyKey === "DUEL" && pending
            ? "Düello hazırlanıyor…"
            : MODE_INFO.DUEL.label}
        </Button>
      </section>
    </div>
  );
}
