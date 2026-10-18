"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { startRunAction } from "@/app/oyun/actions";
import { CategoryIcon } from "@/components/category-icon";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EXAM_TYPES, examTypeBySlug } from "@/lib/exam-types";
import { formatNumber } from "@/lib/format";
import type { RunMode } from "@/lib/game-types";
import { GUEST_RUN_LIMIT, MODE_INFO } from "@/lib/game-types";
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
}: {
  categories: CategoryOption[];
  dailyPlayed: boolean;
  initialError?: string | null;
  isGuest?: boolean;
  guestRunsLeft?: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [examSlug, setExamSlug] = useState<string | null>(null);

  // Misafir deneme hakkı bitti mi?
  const guestBlocked = isGuest && guestRunsLeft !== null && guestRunsLeft <= 0;

  const categoryBySlug = useMemo(
    () => new Map(categories.map((category) => [category.slug, category])),
    [categories],
  );

  const exam = examTypeBySlug(examSlug);

  // Seçilen sınav türüne giren dersler. Karışık türünde liste boştur.
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
      });

      if (!result.ok) {
        setError(result.error);
        setBusyKey(null);
        return;
      }

      router.push(`/oyun/${result.data.runId}`);
    });
  }

  function selectExam(slug: string) {
    setError(null);
    setExamSlug((current) => (current === slug ? null : slug));
  }

  const otherModes: {
    mode: RunMode;
    key: string;
    disabled: boolean;
    note?: string;
    action: () => void;
  }[] = [
    {
      mode: "DAILY",
      key: "DAILY",
      disabled: dailyPlayed,
      note: dailyPlayed ? "Bugün tamamlandı" : undefined,
      action: () => launch("DAILY", { key: "DAILY" }),
    },
    {
      mode: "DUEL",
      key: "DUEL",
      disabled: true,
      note: "Çok yakında",
      action: () => undefined,
    },
  ];

  const mixedBusy = busyKey === "EXAM" && pending;

  return (
    <div className="flex flex-col gap-8">
      {isGuest ? (
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm",
            guestBlocked
              ? "border-danger/40 bg-danger/10 text-danger"
              : "border-brand/30 bg-brand/10 text-brand-soft",
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
                Misafir olarak oynuyorsun — kalan tur hakkın:{" "}
                <strong className="tnum">{guestRunsLeft}</strong> /{" "}
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
          className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-[0.16em] text-ink-faint uppercase">
            1 · Sınav türünü seç
          </h2>
          <p className="text-xs text-ink-faint">KPSS bölümleri</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {EXAM_TYPES.map((type) => {
            const active = type.slug === examSlug;
            const total = questionCountOf(type.categorySlugs);

            return (
              <button
                key={type.slug}
                type="button"
                aria-pressed={active}
                onClick={() => selectExam(type.slug)}
                className={cn(
                  "surface-card group flex flex-col gap-2 p-4 text-left transition",
                  "hover:-translate-y-0.5 hover:border-brand-soft/50",
                  active && "border-brand-soft/60 ring-1 ring-brand-soft/40",
                )}
              >
                <span className="text-2xl" aria-hidden>
                  {type.icon}
                </span>
                <span className="text-sm font-semibold text-ink">
                  {type.name}
                </span>
                <span className="flex-1 text-xs leading-relaxed text-ink-muted">
                  {type.description}
                </span>
                <span className="tnum text-xs text-ink-faint">
                  {formatNumber(total)} soru
                </span>
              </button>
            );
          })}
        </div>

        {exam ? null : (
          <p className="rounded-xl border border-line bg-elevated/50 px-4 py-3 text-sm text-ink-muted">
            Devam etmek için önce bir sınav türü seç. Genel Yetenek,
            Genel Kültür ve Eğitim Bilimleri farklı soru havuzlarıdır.
          </p>
        )}
      </section>

      {exam ? (
        <section className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-[0.16em] text-ink-faint uppercase">
              2 · Dersini seç
            </h2>
            <button
              type="button"
              onClick={() => setExamSlug(null)}
              className="text-xs text-ink-faint underline underline-offset-2 hover:text-ink-muted"
            >
              Sınav türünü değiştir
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-line bg-elevated/50 px-4 py-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-ink">
                {exam.name}
              </span>
              <span className="text-xs text-ink-muted">
                {exam.categorySlugs.length === 0
                  ? "Tüm derslerden karışık sorular"
                  : "Seçili bölümün derslerinden karışık sorular"}
              </span>
            </div>
            <Button
              variant="primary"
              size="sm"
              disabled={pending || guestBlocked}
              onClick={() => launch("EXAM", { examType: exam.slug, key: "EXAM" })}
            >
              {mixedBusy
                ? "Hazırlanıyor…"
                : exam.categorySlugs.length === 0
                  ? "Tüm derslerden karışık 10 soru"
                  : `${exam.name} karma 10 soru`}
            </Button>
          </div>

          {exam.categorySlugs.length === 0 ? null : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                      "surface-card group flex flex-col gap-2 p-4 text-left transition",
                      "hover:-translate-y-0.5 hover:border-brand-soft/50",
                      (!enough || pending || guestBlocked) && "opacity-60",
                    )}
                  >
                    <span
                      className="grid size-9 place-items-center rounded-lg"
                      style={{ backgroundColor: `${category.color}22` }}
                      aria-hidden
                    >
                      <CategoryIcon
                        name={category.icon}
                        color={category.color}
                        size={18}
                      />
                    </span>
                    <span className="text-sm font-semibold text-ink">
                      {category.name}
                    </span>
                    <span className="tnum text-xs text-ink-faint">
                      {isBusy
                        ? "Hazırlanıyor…"
                        : enough
                          ? `${category.questionCount} soru`
                          : `Yetersiz soru (${category.questionCount})`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold tracking-[0.16em] text-ink-faint uppercase">
          Diğer modlar
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {otherModes.map((item) => {
            const info = MODE_INFO[item.mode];
            const isBusy = busyKey === item.key && pending;

            return (
              <Card
                key={item.key}
                className={cn(
                  "flex flex-col transition",
                  !item.disabled &&
                    "hover:-translate-y-0.5 hover:border-brand-soft/50",
                  item.disabled && "opacity-60",
                )}
              >
                <CardContent className="flex flex-1 flex-col gap-3 pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-ink">
                      {info.label}
                    </h3>
                    <Badge
                      tone={
                        item.mode === "DUEL"
                          ? "neutral"
                          : item.mode === "DAILY"
                            ? "warning"
                            : "brand"
                      }
                    >
                      {item.note ?? info.tag}
                    </Badge>
                  </div>

                  <p className="flex-1 text-sm leading-relaxed text-ink-muted">
                    {info.description}
                  </p>

                  <Button
                    variant="secondary"
                    disabled={item.disabled || pending || guestBlocked}
                    onClick={item.action}
                    className="w-full"
                  >
                    {isBusy
                      ? "Hazırlanıyor…"
                      : item.disabled
                        ? "Kilitli"
                        : item.mode === "DAILY"
                          ? "Bugünün turuna başla"
                          : "Başla"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
