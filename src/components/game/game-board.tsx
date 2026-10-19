"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { answerAction } from "@/app/oyun/actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

/**
 * Cevap sonrası otomatik geçiş süreleri.
 * Doğru cevapta hızlı, yanlışta açıklamayı okuyabilmek için daha uzun.
 * "Sonraki soru" butonu yok — tıklama veya Enter/Space ile anında geçilebilir.
 */
const ADVANCE_DELAY_CORRECT_MS = 1300;
const ADVANCE_DELAY_WRONG_MS = 3400;
/** Yanlis cevapta aciklama uzunluguna gore uzayan bekleme suresi ust siniri. */
const ADVANCE_DELAY_EXPLANATION_MAX_MS = 9000;

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

/**
 * Telefonda dokunmatik titreşim. Desteklemeyen cihazlarda sessizce yok sayılır.
 */
function buzz(pattern: number | number[]): void {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Bazı tarayıcılar titreşimi reddedebilir; oyunu engellememeli.
  }
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
  const [bestStreak, setBestStreak] = useState(() =>
    streakAt(view.answered, startIndex),
  );
  const [elapsed, setElapsed] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Sorunun bilerek pas geçilip geçilmediği (süre dolmadan ayrı gösterilir). */
  const [skipped, setSkipped] = useState(false);

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
      // Dokunmatik geri bildirim — destekleyen telefonlarda.
      if (data.isCorrect) buzz([12, 40, 18]);
      else if (data.selectedOption === null) buzz(10);
      else buzz([30, 50, 30]);

      setFeedback(data);
      setScore(data.runningScore);
      setCorrect(data.runningCorrect);
      setStreak(data.streakAfter);
      setBestStreak((current) => Math.max(current, data.streakAfter));
    },
    [question, view.runId],
  );

  // --- Pas geç -------------------------------------------------------------
  // Bilinmeyen soruda 30 saniye beklemek zorunda kalmamak için.
  const skip = useCallback(() => {
    if (submittedRef.current || feedback) return;
    setSkipped(true);
    void submit(null);
  }, [feedback, submit]);

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
    setElapsed(0);
    setSkipped(false);
    setIndex((current) => current + 1);
  }, [feedback, router, view.runId]);

  // --- Otomatik ilerleme ---------------------------------------------------
  // Yanlis cevapta aciklama rahat okunabilsin diye bekleme suresi aciklamanin
  // uzunluguna gore olceklenir. Cevap verildikten sonra Enter'a basmak veya
  // ekrana dokunmak yine de beklemeden sonraki soruya gecirir.
  const explanationReadMs = feedback?.explanation
    ? Math.min(
        ADVANCE_DELAY_WRONG_MS + feedback.explanation.length * 22,
        ADVANCE_DELAY_EXPLANATION_MAX_MS,
      )
    : ADVANCE_DELAY_WRONG_MS;

  const advanceMs = feedback
    ? feedback.isCorrect
      ? ADVANCE_DELAY_CORRECT_MS
      : explanationReadMs
    : 0;

  useEffect(() => {
    if (!feedback) return;
    const id = window.setTimeout(goNext, advanceMs);
    return () => window.clearTimeout(id);
  }, [feedback, advanceMs, goNext]);

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
        return;
      }

      // "s" → pas geç (bilinmeyen soruda beklemeden ilerle).
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        void skip();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [feedback, goNext, skip, submit]);

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
  const streakUp = Boolean(feedback && feedback.streakAfter > 1);

  return (
    <div className="flex flex-col gap-4">
      {/* Kompakt üst şerit: ilerleme + puan + seri */}
      <div className="flex items-center gap-3">
        <span className="tnum shrink-0 text-sm font-semibold text-ink">
          {index + 1}
          <span className="text-ink-faint">/{view.questions.length}</span>
        </span>

        <div
          className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-label={`Tur ilerlemesi: ${index + 1}/${view.questions.length}`}
          aria-valuenow={index + 1}
          aria-valuemin={0}
          aria-valuemax={view.questions.length}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand to-accent transition-[width] duration-500 ease-out"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>

        <span className="tnum shrink-0 text-sm font-bold text-brand-soft">
          {formatNumber(score)}
          <span className="ml-0.5 text-xs font-medium text-ink-faint">p</span>
        </span>

        {streak >= 2 ? (
          <span
            key={streak}
            className={cn(
              "tnum shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-bold text-warning",
              streakUp && "animate-streak",
            )}
          >
            {streak} 🔥
          </span>
        ) : null}
      </div>

      {resumed && !feedback && index === startIndex ? (
        <p className="rounded-xl border border-brand/25 bg-brand/5 px-4 py-2 text-sm text-ink-muted">
          Yarım kalan turuna devam ediyorsun — {view.answered.length} soru zaten
          cevaplandı.
        </p>
      ) : null}

      {/* Soru kartı */}
      <Card className="animate-rise overflow-hidden" key={question.position}>
        <CardContent className="flex flex-col gap-4 p-0">
          {/* Süre çubuğu — kartın en üstünde ince bir şerit */}
          {!feedback ? (
            <div
              className="h-1 w-full bg-line"
              role="progressbar"
              aria-label="Kalan süre"
            >
              <div
                className={cn(
                  "h-full bg-gradient-to-r transition-[width] duration-100 ease-linear",
                  timerTone(remainingRatio),
                  secondsLeft <= 5 && "animate-pulse-soft",
                )}
                style={{ width: `${remainingRatio * 100}%` }}
              />
            </div>
          ) : null}

          <div className="flex flex-col gap-4 px-5 pt-5 pb-5">
            {/* Etiketler + sayaç */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">{question.categoryName}</Badge>
              <Badge tone="neutral">
                {DIFFICULTY_LABEL[question.difficulty] ?? "Orta"}
              </Badge>
              {question.topic ? (
                <Badge tone="neutral">{question.topic}</Badge>
              ) : null}

              {!feedback ? (
                <span
                  className={cn(
                    "tnum ml-auto text-sm font-semibold",
                    secondsLeft <= 5 ? "text-danger" : "text-ink-muted",
                  )}
                >
                  {secondsLeft} sn
                </span>
              ) : null}
            </div>

            <p className="text-lg leading-relaxed font-medium text-ink sm:text-xl">
              {question.text}
            </p>

            {/* Seçenekler — sırayla belirir */}
            <div className="flex flex-col gap-2">
              {question.options.map((option, optionIndex) => {
                const isCorrectOption = feedback?.correctOption === option.key;
                const isPicked = feedback?.selectedOption === option.key;
                const revealed = Boolean(feedback);

                return (
                  <button
                    key={option.key}
                    type="button"
                    disabled={revealed || pending}
                    onClick={() => void submit(option.key)}
                    style={{ animationDelay: `${optionIndex * 45}ms` }}
                    className={cn(
                      "animate-stagger group flex w-full items-start gap-3 rounded-xl border px-4 py-2.5 text-left transition",
                      "border-line bg-elevated/50",
                      !revealed &&
                        !pending &&
                        "hover:-translate-y-px hover:border-brand/40 hover:bg-elevated",
                      pending && "opacity-60",
                      revealed &&
                        isCorrectOption &&
                        "animate-glow border-success/60 bg-success/8",
                      revealed &&
                        isPicked &&
                        !isCorrectOption &&
                        "animate-shake border-danger/60 bg-danger/8",
                      revealed && !isCorrectOption && !isPicked && "opacity-45",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-lg border text-xs font-bold transition",
                        "border-line-strong bg-surface text-ink-muted",
                        revealed &&
                          isCorrectOption &&
                          "border-success bg-success text-white",
                        revealed &&
                          isPicked &&
                          !isCorrectOption &&
                          "border-danger bg-danger text-white",
                      )}
                    >
                      {option.key}
                    </span>
                    <span className="pt-0.5 text-sm leading-relaxed text-ink sm:text-base">
                      {option.text}
                    </span>
                    {revealed && isCorrectOption ? (
                      <span className="ml-auto shrink-0 pt-0.5 font-bold text-success">
                        ✓
                      </span>
                    ) : null}
                    {revealed && isPicked && !isCorrectOption ? (
                      <span className="ml-auto shrink-0 pt-0.5 font-bold text-danger">
                        ✕
                      </span>
                    ) : null}
                  </button>
                );
              })}
              {!feedback && !pending ? (
                <button
                  type="button"
                  title="Bilmiyorsan pas geç (S)"
                  onClick={() => void skip()}
                  className="mt-1 self-end rounded-lg px-2 py-1 text-xs font-medium text-ink-faint transition hover:text-danger hover:underline hover:underline-offset-4"
                >
                  Pas geç
                </button>
              ) : null}
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm text-danger"
              >
                {error}
              </p>
            ) : null}

            {pending ? (
              <p className="text-sm text-ink-faint">Cevabın kaydediliyor…</p>
            ) : null}

            {/* Cevap sonrası geri bildirim — buton yok, otomatik geçiş */}
            {feedback ? (
              <div
                className="animate-rise flex cursor-pointer flex-col gap-3 border-t border-line pt-4 select-none"
                onClick={goNext}
                role="button"
                tabIndex={0}
                aria-label={
                  feedback.isLast ? "Sonuçları gör" : "Sonraki soruya geç"
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    goNext();
                  }
                }}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={cn(
                      "relative text-sm font-semibold",
                      feedback.isCorrect ? "text-success" : "text-danger",
                    )}
                  >
                    {feedback.isCorrect
                      ? "Doğru!"
                      : feedback.selectedOption === null
                        ? skipped
                          ? "Pas geçtin"
                          : "Süre doldu"
                        : "Yanlış"}
                    {feedback.isCorrect && feedback.points > 0 ? (
                      <span className="tnum animate-float-up pointer-events-none absolute -top-1 left-full ml-2 font-bold whitespace-nowrap text-success">
                        +{feedback.points}
                      </span>
                    ) : null}
                  </span>

                  {feedback.isCorrect ? (
                    <span className="tnum rounded-full border border-brand/30 bg-brand/5 px-3 py-0.5 text-xs text-brand-soft">
                      {feedback.speedBonus > 0
                        ? `hız +${feedback.speedBonus}`
                        : "hız bonusu yok"}
                      {feedback.streakBonus > 0
                        ? ` · seri +${feedback.streakBonus}`
                        : ""}
                    </span>
                  ) : (
                    <span className="text-xs text-ink-muted">
                      Doğru cevap:{" "}
                      <strong className="text-success">
                        {feedback.correctOption}
                      </strong>
                    </span>
                  )}

                  {feedback.streakAfter >= 3 ? (
                    <Badge tone="warning">{feedback.streakAfter} seri 🔥</Badge>
                  ) : null}
                </div>

                {feedback.explanation ? (
                  <p className="rounded-xl border border-line bg-elevated/50 px-4 py-3 text-sm leading-relaxed text-ink-muted">
                    {feedback.explanation}
                  </p>
                ) : null}

                <div className="flex items-center justify-between gap-3 text-xs text-ink-faint">
                  <span>
                    {feedback.isLast
                      ? "Sonuçlara geçiliyor…"
                      : "Sonraki soruya geçiliyor…"}
                  </span>
                  <span className="hidden sm:inline">
                    Tıkla veya <kbd className="font-sans">Enter</kbd>
                  </span>
                </div>

                {/* Otomatik geçiş göstergesi */}
                <div className="h-0.5 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className={cn(
                      "animate-advance h-full rounded-full",
                      feedback.isCorrect ? "bg-success" : "bg-brand",
                    )}
                    style={{ animationDuration: `${advanceMs}ms` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-xs text-ink-faint">
        <span>
          En uzun seri: <span className="tnum">{bestStreak}</span> · Doğru:{" "}
          <span className="tnum">{correct}</span> · Mod:{" "}
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
            : feedback.selectedOption === null
              ? skipped
                ? "Soruyu pas geçtin"
                : "Süre doldu"
              : "Yanlış cevap"
          : `Soru ${index + 1}`}
      </p>
    </div>
  );
}
