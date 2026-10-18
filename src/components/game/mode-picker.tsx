"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { startRunAction } from "@/app/oyun/actions";
import { CategoryIcon } from "@/components/category-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { RunMode } from "@/lib/game-types";
import { MODE_INFO } from "@/lib/game-types";
import { cn } from "@/lib/utils";

export interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string | null;
  questionCount: number;
}

export function ModePicker({
  categories,
  dailyPlayed,
  initialError,
}: {
  categories: CategoryOption[];
  dailyPlayed: boolean;
  initialError?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError ?? null);

  function launch(mode: RunMode, categoryId?: string, key?: string) {
    setError(null);
    setBusyKey(key ?? mode);

    startTransition(async () => {
      const result = await startRunAction({ mode, categoryId: categoryId ?? null });

      if (!result.ok) {
        setError(result.error);
        setBusyKey(null);
        return;
      }

      router.push(`/oyun/${result.data.runId}`);
    });
  }

  const modes: {
    mode: RunMode;
    key: string;
    disabled: boolean;
    note?: string;
    action: () => void;
  }[] = [
    {
      mode: "QUICK",
      key: "QUICK",
      disabled: false,
      action: () => launch("QUICK", undefined, "QUICK"),
    },
    {
      mode: "DAILY",
      key: "DAILY",
      disabled: dailyPlayed,
      note: dailyPlayed ? "Bugün tamamlandı" : undefined,
      action: () => launch("DAILY", undefined, "DAILY"),
    },
    {
      mode: "DUEL",
      key: "DUEL",
      disabled: true,
      note: "Çok yakında",
      action: () => undefined,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold tracking-[0.16em] text-ink-faint uppercase">
          Oyun modları
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modes.map((item) => {
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
                    variant={item.mode === "QUICK" ? "primary" : "secondary"}
                    disabled={item.disabled || pending}
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

      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-[0.16em] text-ink-faint uppercase">
            Kategori turu
          </h2>
          <p className="text-xs text-ink-faint">
            Bir derse odaklan — 10 soru
          </p>
        </div>

        {categories.length === 0 ? (
          <p className="rounded-xl border border-line bg-elevated/50 px-4 py-6 text-center text-sm text-ink-muted">
            Henüz kategori eklenmemiş.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => {
              const isBusy = busyKey === category.id && pending;
              const enough = category.questionCount >= 10;

              return (
                <button
                  key={category.id}
                  type="button"
                  disabled={pending || !enough}
                  onClick={() => launch("CATEGORY", category.id, category.id)}
                  className={cn(
                    "surface-card group flex flex-col gap-2 p-4 text-left transition",
                    "hover:-translate-y-0.5 hover:border-brand-soft/50",
                    (!enough || pending) && "opacity-60",
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
    </div>
  );
}
