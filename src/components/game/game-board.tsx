"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { answerAction } from "@/app/oyun/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatNumber } from "@/lib/format";
import type {
  AnsweredSummary,
  AnswerFeedback,
  OptionKey,
  RunView,
} from "@/lib/game-types";
import { DIFFICULTY_LABEL, QUESTION_TIME_MS } from "@/lib/scoring";
import { cn } from "@/lib/utils";

const KEY_TO_OPTION: Record<string, OptionKey> = {
  a: "A",
  b: "B",
  c: "C",
  d: "D",
  "1": "A",
  "2": "B",
  "3": "C",
  "4": "D",
};

/** Boş bırakılan sorular seriyi kırar; devam eden turda seriyi geri hesaplar. */
function streakAt(answered: AnsweredSummary[], position: number): number {
  const byPosition = new Map(answered.map((item) => [item.position, item]));
  let streak = 0;
  for (let i = position - 1; i >= 0; i -= 1) {
    const item = byPosition.get(i);
    if (item?.isCorrect) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

function timerTone(ratio: number): string {
  if (ratio > 0.5) return "from-brand to-accent";
  if (ratio > 0.25) return "from-warning to-warning";
  return "from-danger to-danger";
}

export function GameBoard({ view }: { view: RunView }) {
  const router = useRouter();

  const startIndex = useMemo(() => {
    const firstUnanswered = view.questions.findIndex(
      (question) =>
        !view.answered.some((item) => item.position === question.position),
    );
    return firstUnanswered === -1 ? view.questions.length - 1 : firstUnanswered;
  }, [view.questions, view.answered]);

  const resumed = view.answered.length > 0;

  const [index, setIndex] = useState(startIndex);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [score, setScore] = useState(view.score);
  const [correct, setCorrect] = useState(view.correctCount);
  const [streak, setStreak] = useState(() => streakAt(view.answered, startIndex));
  const [bestStreak, setBestStreak] = useState(() => streakAt(view.answered, startIndex));
  const [elapsed, setElapsed] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submittedRef = useRef(false);
  const elapsedRef = useRef(0);

  const question = view.questions[index];
  const isLast = index === view.questions.length - 1;

  // --- Süre sayacı ---------------------------------------------------------
  useEffect(() => {
    if (feedback) return;

    const startedAt = Date.now();
    elapsedRef.current = 0;
    setElapsed(0);

    const id = window.setInterval(() => {
      const value = Math.min(Date.now() - startedAt, QUESTION_TIME_MS);
      elapsedRef.current = value;
      setElapsed(value);
      if (value >= QUESTION_TIME_MS) {
        window.clearInterval(id);
      }
    }, 100);

    return () => window.clearInterval(id);
  }, [index, feedback]);

  // --- Cevap gönderme ------------------------------------------------------
  const submit = useCallback(
    async (option: OptionKey | null) => {
      if (submittedRef.current || !question) return;
      submittedRef.current = true;
      setPending(true);
      setError(null);

      const result = await answerAction({
        runId: view.runId,
        position: question.position,
        selectedOption: option,
        clientTimeMs: Math.round(elapsedRef.current),
      });

      setPending(false);

      if (!result.ok) {
        submittedRef.current = false;
        setError(result.error);
        return;
      }

      const data = result.data;
      setFeedback(data);
      setScore(data.runningScore);
      setCorrect(data.runningCorrect);
      setStreak(data.streakAfter);
      setBestStreak((current) => Math.max(current, data.streakAfter));
    },
    [question, view.runId],
  );

  // --- Süre dolunca otomatik gönder ---------------------------------------
  useEffect(() => {
    if (!feedback && !pending && elapsed >= QUESTION_TIME_MS) {
      void submit(null);
    }
  }, [elapsed, feedback, pending, submit]);

  // --- Sonraki soru --------------------------------------------------------
  const goNext = useCallback(() => {
    if (!feedback) return;

    if (feedback.isLast) {
      router.push(`/oyun/${view.runId}/sonuc`);
      return;
    }

    submittedRef.current = false;
    setFeedback(null);
    setError(null);
    setIndex((current) => current + 1);
  }, [feedback, router, view.runId]);

  // --- Klavye kısayolları --------------------------------------------------
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (feedback) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          goNext();
        }
        return;
      }

      const option = KEY_TO_OPTION[event.key.toLowerCase()];
      if (option) {
        event.preventDefault();
        void submit(option);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [feedback, goNext, submit]);

  if (!question) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-ink-muted">
          Bu turda soru bulunamadı.
        </CardContent>
      </Card>
    );
  }

  const remainingRatio = Math.max(0, 1 - elapsed / QUESTION_TIME_MS);
  const secondsLeft = Math.ceil((QUESTION_TIME_MS - elapsed) / 1000);
  const progress = (index + (feedback ? 1 : 0)) / view.questions.length;

  return (
    <div className="flex flex-col gap-5">
      {/* Üst bilgi çubuğu */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Soru" value={`${index + 1}/${view.questions.length}`} />
        <StatTile label="Puan" value={formatNumber(score)} tone="brand" />
        <StatTile label="Doğru" value={String(correct)} tone="success" />
        <StatTile
          label="Seri"
          value={`${streak}${streak >= 3 ? " 🔥" : ""}`}
          tone={streak >= 3 ? "warning" : "plain"}
        />
      </div>

      <Progress value={progress} label={`Tur ilerlemesi: ${index + 1}/${view.questions.length}`} />

      {resumed && !feedback && index === startIndex ? (
        <p className="rounded-xl border border-brand/30 bg-brand/10 px-4 py-2.5 text-sm text-brand-soft">
          Yarım kalan turuna devam ediyorsun — {view.answered.length} soru zaten
          cevaplandı.
        </p>
      ) : null}

      {/* Soru kartı */}
      <Card className="animate-rise" key={question.position}>
        <CardContent className="flex flex-col gap-5 pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">{question.categoryName}</Badge>
            <Badge tone="neutral">
              {DIFFICULTY_LABEL[question.difficulty] ?? "Orta"}
            </Badge>
            {question.topic ? <Badge tone="neutral">{question.topic}</Badge> : null}
            {!feedback ? (
              <span className="ml-auto flex items-center gap-2 text-sm">
                <span
                  className={cn(
                    "tnum font-semibold",
                    secondsLeft <= 5 ? "text-danger" : "text-ink-muted",
                  )}
                >
                  {secondsLeft} sn
                </span>
              </span>
            ) : null}
          </div>

          {!feedback ? (
            <Progress
              value={remainingRatio}
              barClassName={cn("bg-gradient-to-r", timerTone(remainingRatio))}
              className="h-1.5"
              label="Kalan süre"
            />
          ) : null}

          <p className="text-lg leading-relaxed font-medium text-ink sm:text-xl">
            {question.text}
          </p>

          <div className="flex flex-col gap-2.5">
            {question.options.map((option) => {
              const isCorrectOption = feedback?.correctOption === option.key;
              const isPicked = feedback?.selectedOption === option.key;
              const revealed = Boolean(feedback);

              return (
                <button
                  key={option.key}
                  type="button"
                  disabled={revealed || pending}
                  onClick={() => void submit(option.key)}
                  className={cn(
                    "group flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition",
                    "border-line bg-elevated/60",
                    !revealed &&
                      !pending &&
                      "hover:border-brand-soft/60 hover:bg-elevated focus-visible:border-brand-soft",
                    pending && "opacity-60",
                    revealed &&
                      isCorrectOption &&
                      "border-success/70 bg-success/12 text-ink",
                    revealed &&
                      isPicked &&
                      !isCorrectOption &&
                      "border-danger/70 bg-danger/12",
                    revealed && !isCorrectOption && !isPicked && "opacity-55",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-lg border text-sm font-bold",
                      "border-line-strong bg-canvas/60 text-ink-muted",
                      revealed &&
                        isCorrectOption &&
                        "border-success bg-success text-canvas",
                      revealed &&
                        isPicked &&
                        !isCorrectOption &&
                        "border-danger bg-danger text-canvas",
                    )}
                  >
                    {option.key}
                  </span>
                  <span className="pt-0.5 text-sm leading-relaxed text-ink sm:text-base">
                    {option.text}
                  </span>
                  {revealed && isCorrectOption ? (
                    <span className="ml-auto shrink-0 pt-0.5 text-success">✓</span>
                  ) : null}
                  {revealed && isPicked && !isCorrectOption ? (
                    <span className="ml-auto shrink-0 pt-0.5 text-danger">✕</span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger"
            >
              {error}
            </p>
          ) : null}

          {pending ? (
            <p className="text-sm text-ink-faint">Cevabın kaydediliyor…</p>
          ) : null}

          {/* Cevap sonrası geri bildirim */}
          {feedback ? (
            <div className="animate-rise flex flex-col gap-3 border-t border-line pt-4">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={cn(
                    "text-sm font-semibold",
                    feedback.isCorrect ? "text-success" : "text-danger",
                  )}
                >
                  {feedback.isCorrect
                    ? "Doğru!"
                    : feedback.selectedOption === null
                      ? "Süre doldu"
                      : "Yanlış"}
                </span>

                {feedback.isCorrect ? (
                  <span className="tnum rounded-full border border-brand/40 bg-brand/10 px-3 py-0.5 text-xs text-brand-soft">
                    +{feedback.points} puan
                    {feedback.speedBonus > 0 ? ` · hız +${feedback.speedBonus}` : ""}
                    {feedback.streakBonus > 0 ? ` · seri +${feedback.streakBonus}` : ""}
                  </span>
                ) : (
                  <span className="text-xs text-ink-muted">
                    Doğru cevap:{" "}
                    <strong className="text-success">{feedback.correctOption}</strong>
                  </span>
                )}

                {feedback.streakAfter >= 3 ? (
                  <Badge tone="warning">
                    {feedback.streakAfter} seri 🔥
                  </Badge>
                ) : null}
              </div>

              {feedback.explanation ? (
                <p className="rounded-xl border border-line bg-canvas/50 px-4 py-3 text-sm leading-relaxed text-ink-muted">
                  {feedback.explanation}
                </p>
              ) : null}

              <div className="flex items-center gap-3">
                <Button size="lg" onClick={goNext}>
                  {feedback.isLast ? "Sonuçları gör" : "Sonraki soru"}
                </Button>
                <span className="hidden text-xs text-ink-faint sm:inline">
                  Enter tuşuyla da geçebilirsin
                </span>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-xs text-ink-faint">
        <span>
          En uzun seri: <span className="tnum">{bestStreak}</span> · Mod:{" "}
          {view.categoryName ?? "Karma"}
        </span>
        <button
          type="button"
          className="rounded-md px-2 py-1 transition hover:text-danger"
          onClick={() => {
            if (window.confirm("Tur'dan çıkmak istediğine emin misin?")) {
              router.push("/oyna");
            }
          }}
        >
          Tur&apos;dan çık
        </button>
      </div>

      <p className="sr-only" aria-live="polite">
        {feedback
          ? feedback.isCorrect
            ? "Doğru cevap"
            : "Yanlış cevap"
          : `Soru ${index + 1}`}
      </p>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone = "plain",
}: {
  label: string;
  value: string;
  tone?: "plain" | "brand" | "success" | "warning";
}) {
  return (
    <div className="surface-card flex flex-col gap-0.5 px-3.5 py-2.5">
      <span className="text-[0.68rem] font-medium tracking-wide text-ink-faint uppercase">
        {label}
      </span>
      <span
        className={cn(
          "tnum text-lg font-bold",
          tone === "brand" && "text-brand-soft",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
          tone === "plain" && "text-ink",
        )}
      >
        {value}
      </span>
    </div>
  );
}
