"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDuration, formatNumber } from "@/lib/format";
import type { QuestionReviewItem } from "@/lib/game-types";
import { DIFFICULTY_LABEL } from "@/lib/scoring";
import { cn } from "@/lib/utils";

type Filter = "all" | "correct" | "wrong" | "skipped";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Tümü" },
  { id: "correct", label: "Doğrular" },
  { id: "wrong", label: "Yanlışlar" },
  { id: "skipped", label: "Boşlar" },
];

/**
 * Turdaki TÜM soruların dökümü.
 *
 * KPSS hazırlığında asıl değer buradadır: sadece yanlışlar değil, doğru
 * yapılan soruların da gerekçesi görülebilmeli. Her soru `<details>`
 * ile açılıp kapanır — JavaScript olmadan da çalışır.
 */
export function RunRundown({ items }: { items: QuestionReviewItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(
    () => ({
      all: items.length,
      correct: items.filter((item) => item.isCorrect).length,
      wrong: items.filter((item) => item.answered && !item.isCorrect).length,
      skipped: items.filter((item) => !item.answered).length,
    }),
    [items],
  );

  const visible = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "correct") return items.filter((item) => item.isCorrect);
    if (filter === "wrong") {
      return items.filter((item) => item.answered && !item.isCorrect);
    }
    return items.filter((item) => !item.answered);
  }, [filter, items]);

  // İlk hatalı soru, listede otomatik açık başlar.
  const firstWrongPosition = useMemo(() => {
    const target = visible.find((item) => !item.isCorrect);
    return target ? target.position : -1;
  }, [visible]);

  if (items.length === 0) return null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-ink">
            Tüm sorular ({items.length})
          </h2>
          <p className="text-xs text-ink-faint">
            Doğru cevabı ve açıklamayı inceleyerek pekiştir
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((entry) => {
            const active = filter === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(entry.id)}
                className={cn(
                  "rounded-lg border px-3 py-1 text-sm font-medium transition",
                  active
                    ? "border-brand/50 bg-brand/10 text-brand-soft"
                    : "border-line bg-canvas/40 text-ink-muted hover:bg-elevated/60 hover:text-ink",
                )}
              >
                {entry.label}
                <span className="tnum ml-1.5 text-xs opacity-70">
                  {counts[entry.id]}
                </span>
              </button>
            );
          })}
        </div>

        {visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-faint">
            Bu filtrede soru yok.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {visible.map((item) => (
              <li key={item.position}>
                <details
                  className="group rounded-xl border border-line bg-canvas/40"
                  open={item.position === firstWrongPosition}
                >
                  <summary className="flex cursor-pointer list-none items-start gap-3 p-3.5 [&::-webkit-details-marker]:hidden">
                    <span className="tnum grid size-6 shrink-0 place-items-center rounded-md border border-line-strong bg-elevated text-xs font-bold text-ink-muted">
                      {item.position + 1}
                    </span>
                    <span className="min-w-0 flex-1 text-sm leading-snug text-ink">
                      {item.text}
                    </span>
                    <StatusBadge item={item} />
                    <span className="mt-0.5 shrink-0 text-ink-faint transition group-open:rotate-90">
                      ›
                    </span>
                  </summary>

                  <div className="flex flex-col gap-3 border-t border-line px-3.5 py-3">
                    <ul className="flex flex-col gap-1.5">
                      {item.options.map((option) => {
                        const isCorrect = option.key === item.correctOption;
                        const isPickedWrong =
                          option.key === item.selectedOption && !item.isCorrect;
                        return (
                          <li
                            key={option.key}
                            className={cn(
                              "flex items-start gap-2.5 rounded-lg border px-3 py-2 text-sm",
                              isCorrect &&
                                "border-success/40 bg-success/10 text-ink",
                              isPickedWrong &&
                                "border-danger/40 bg-danger/10 text-ink",
                              !isCorrect &&
                                !isPickedWrong &&
                                "border-line bg-elevated/40 text-ink-muted",
                            )}
                          >
                            <span className="tnum grid size-5 shrink-0 place-items-center rounded border border-line-strong bg-canvas text-[0.65rem] font-bold">
                              {option.key}
                            </span>
                            <span className="min-w-0 flex-1 leading-relaxed">
                              {option.text}
                            </span>
                            {isCorrect ? (
                              <Badge tone="success">Doğru cevap</Badge>
                            ) : isPickedWrong ? (
                              <Badge tone="danger">Senin cevabın</Badge>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>

                    {item.explanation ? (
                      <p className="rounded-lg border border-line bg-elevated/40 px-3 py-2.5 text-sm leading-relaxed text-ink-muted">
                        {item.explanation}
                      </p>
                    ) : null}

                    <p className="text-xs text-ink-faint">
                      {DIFFICULTY_LABEL[item.difficulty] ?? "Orta"}
                      {" · "}
                      {item.answered
                        ? `${formatDuration(item.timeMs)} · ${formatNumber(item.points)} puan`
                        : "Cevaplanmadı"}
                    </p>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ item }: { item: QuestionReviewItem }) {
  if (item.isCorrect) {
    return <Badge tone="success">Doğru</Badge>;
  }
  if (!item.answered) {
    return <Badge tone="warning">Boş</Badge>;
  }
  return <Badge tone="danger">Yanlış</Badge>;
}
