/**
 * Umut — oyun motoru (sunucu tarafı, otoriter).
 *
 * Tasarım ilkeleri:
 * - Doğru cevap ve puan SUNUCUDA hesaplanır; istemci yalnızca gösterir.
 * - İstemciden gelen süre (clientTimeMs) sunucudaki geçen süreyle kırpılır;
 *   böylece "0 ms cevap" hilesiyle hız bonusu toplanamaz.
 * - Her sunucu eylemi kendi yetki kontrolünü yapar (proxy'ye güvenilmez).
 */

import type {
  AnswerFeedback,
  AnsweredSummary,
  MissedQuestion,
  OptionKey,
  RunMode,
  RunQuestion,
  RunSummary,
  RunView,
} from "@/lib/game-types";
import { daySeed, shuffle, shuffleSeeded, startOfToday } from "@/lib/random";
import {
  QUESTIONS_PER_RUN,
  QUESTION_TIME_MS,
  accuracy,
  gradeFor,
  levelFromXp,
  scoreAnswer,
  xpForRun,
} from "@/lib/scoring";
import { prisma } from "@/lib/prisma";

export type GameErrorCode =
  | "RUN_NOT_FOUND"
  | "FORBIDDEN"
  | "NOT_IN_PROGRESS"
  | "ALREADY_ANSWERED"
  | "POSITION_OUT_OF_RANGE"
  | "NOT_ENOUGH_QUESTIONS"
  | "NO_CATEGORY"
  | "DAILY_ALREADY_PLAYED";

/** Kullanıcıya gösterilebilir, Türkçe mesajlı oyun hatası. */
export class GameError extends Error {
  readonly code: GameErrorCode;

  constructor(code: GameErrorCode, message: string) {
    super(message);
    this.name = "GameError";
    this.code = code;
  }
}

function asOptionKey(value: string | null): OptionKey | null {
  if (value === "A" || value === "B" || value === "C" || value === "D") {
    return value;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Tur başlatma
// ---------------------------------------------------------------------------

export interface StartRunInput {
  userId: string;
  mode: RunMode;
  categoryId?: string | null;
  questionCount?: number;
}

export interface StartRunResult {
  runId: string;
}

export async function startRun({
  userId,
  mode,
  categoryId,
  questionCount = QUESTIONS_PER_RUN,
}: StartRunInput): Promise<StartRunResult> {
  const count = Math.max(1, Math.min(questionCount, 50));

  if (mode === "DUEL") {
    throw new GameError(
      "NOT_ENOUGH_QUESTIONS",
      "Düello modu henüz açık değil. Çok yakında!",
    );
  }

  if (mode === "DAILY") {
    const alreadyPlayed = await prisma.gameRun.findFirst({
      where: {
        userId,
        mode: "DAILY",
        status: "COMPLETED",
        startedAt: { gte: startOfToday() },
      },
      select: { id: true },
    });

    if (alreadyPlayed) {
      throw new GameError(
        "DAILY_ALREADY_PLAYED",
        "Bugünün meydan okumasını tamamladın. Yarın yeni sorular seni bekliyor!",
      );
    }
  }

  if (mode === "CATEGORY" && !categoryId) {
    throw new GameError("NO_CATEGORY", "Kategori turu için bir ders seçmelisin.");
  }

  const effectiveCategoryId = mode === "CATEGORY" ? categoryId : null;

  const candidates = await prisma.question.findMany({
    where: {
      isActive: true,
      ...(effectiveCategoryId ? { categoryId: effectiveCategoryId } : {}),
    },
    select: { id: true },
  });

  if (candidates.length < count) {
    throw new GameError(
      "NOT_ENOUGH_QUESTIONS",
      `Bu seçim için yeterli soru yok (${candidates.length}/${count}). Lütfen başka bir mod dene.`,
    );
  }

  const ids = candidates.map((row) => row.id);
  // Günlük turda sorular herkes için aynı ve deterministik olmalı.
  const ordered = mode === "DAILY" ? shuffleSeeded(ids, daySeed()) : shuffle(ids);
  const selected = ordered.slice(0, count);

  const run = await prisma.gameRun.create({
    data: {
      userId,
      mode,
      categoryId: effectiveCategoryId,
      totalQuestions: selected.length,
      status: "IN_PROGRESS",
    },
    select: { id: true },
  });

  await prisma.gameAnswer.createMany({
    data: selected.map((questionId, position) => ({
      runId: run.id,
      questionId,
      position,
    })),
  });

  return { runId: run.id };
}

// ---------------------------------------------------------------------------
// Turu okuma (devam edilebilirlik için)
// ---------------------------------------------------------------------------

export async function getRunView(
  runId: string,
  userId: string,
): Promise<RunView> {
  const run = await prisma.gameRun.findUnique({
    where: { id: runId },
    include: {
      category: { select: { name: true } },
      answers: {
        orderBy: { position: "asc" },
        include: {
          question: {
            select: {
              id: true,
              text: true,
              optionA: true,
              optionB: true,
              optionC: true,
              optionD: true,
              correctOption: true,
              explanation: true,
              difficulty: true,
              topic: true,
              category: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!run) {
    throw new GameError("RUN_NOT_FOUND", "Böyle bir tur bulunamadı.");
  }

  if (run.userId !== userId) {
    throw new GameError("FORBIDDEN", "Bu tur size ait değil.");
  }

  const questions: RunQuestion[] = run.answers.map((answer) => ({
    position: answer.position,
    questionId: answer.questionId,
    text: answer.question.text,
    options: [
      { key: "A" as const, text: answer.question.optionA },
      { key: "B" as const, text: answer.question.optionB },
      { key: "C" as const, text: answer.question.optionC },
      { key: "D" as const, text: answer.question.optionD },
    ],
    difficulty: answer.question.difficulty,
    topic: answer.question.topic,
    categoryName: answer.question.category.name,
  }));

  const answered: AnsweredSummary[] = run.answers
    .filter((answer) => answer.answered)
    .map((answer) => ({
      position: answer.position,
      selectedOption: asOptionKey(answer.selectedOption),
      isCorrect: answer.isCorrect,
      correctOption: (asOptionKey(answer.question.correctOption) ?? "A") as OptionKey,
      explanation: answer.question.explanation,
      points: answer.points,
    }));

  return {
    runId: run.id,
    mode: run.mode as RunMode,
    status: run.status,
    categoryName: run.category?.name ?? null,
    totalQuestions: run.totalQuestions,
    score: run.answers.reduce((total, answer) => total + answer.points, 0),
    correctCount: run.answers.filter((answer) => answer.isCorrect).length,
    questions,
    answered,
  };
}

// ---------------------------------------------------------------------------
// Cevap gönderme
// ---------------------------------------------------------------------------

export interface AnswerQuestionInput {
  userId: string;
  runId: string;
  position: number;
  selectedOption: OptionKey | null;
  clientTimeMs: number;
}

export async function answerQuestion({
  userId,
  runId,
  position,
  selectedOption,
  clientTimeMs,
}: AnswerQuestionInput): Promise<AnswerFeedback> {
  const run = await prisma.gameRun.findUnique({
    where: { id: runId },
    include: {
      answers: {
        orderBy: { position: "asc" },
        include: {
          question: {
            select: { correctOption: true, difficulty: true, explanation: true },
          },
        },
      },
    },
  });

  if (!run) {
    throw new GameError("RUN_NOT_FOUND", "Böyle bir tur bulunamadı.");
  }
  if (run.userId !== userId) {
    throw new GameError("FORBIDDEN", "Bu tur size ait değil.");
  }
  if (run.status !== "IN_PROGRESS") {
    throw new GameError("NOT_IN_PROGRESS", "Bu tur artık aktif değil.");
  }

  const index = run.answers.findIndex((answer) => answer.position === position);
  if (index === -1) {
    throw new GameError("POSITION_OUT_OF_RANGE", "Geçersiz soru sırası.");
  }

  const answer = run.answers[index];
  if (answer.answered) {
    throw new GameError("ALREADY_ANSWERED", "Bu soru zaten cevaplandı.");
  }

  // Seri: bu sorudan önceki ardışık doğru sayısı.
  let streakBefore = 0;
  for (let i = index - 1; i >= 0; i -= 1) {
    if (run.answers[i].isCorrect) {
      streakBefore += 1;
    } else {
      break;
    }
  }

  // Sunucu tarafı üst sınır: bir önceki cevaptan (veya tur başlangıcından)
  // bu yana geçen süreden fazla süre bildirilemez.
  const previousAt =
    index === 0 ? run.startedAt : (run.answers[index - 1].answeredAt ?? run.startedAt);
  const serverElapsedMs = Math.max(Date.now() - previousAt.getTime(), 0);

  const correctOptionRaw = answer.question.correctOption;
  const correctOption = (asOptionKey(correctOptionRaw) ?? "A") as OptionKey;

  const isCorrect = selectedOption !== null && selectedOption === correctOption;

  // Zaman aşımı senaryosunda istemci süreyi bildirmez; sunucu süresi kullanılır.
  const reportedTime = Number.isFinite(clientTimeMs)
    ? Math.max(clientTimeMs, 0)
    : QUESTION_TIME_MS;
  const timeMs = Math.round(Math.min(reportedTime, serverElapsedMs, QUESTION_TIME_MS));

  // Puan kırılımı (hız + seri bonusu) tek kaynaktan: scoring.ts
  const breakdown = scoreAnswer({
    isCorrect,
    timeMs,
    difficulty: answer.question.difficulty,
    streakBefore,
  });
  const points = breakdown.points;

  await prisma.gameAnswer.update({
    where: { runId_position: { runId, position } },
    data: {
      selectedOption,
      answered: true,
      isCorrect,
      timeMs,
      points,
      answeredAt: new Date(),
    },
  });

  const runningScore =
    run.answers.reduce((total, row) => total + row.points, 0) + points;
  const runningCorrect =
    run.answers.filter((row) => row.isCorrect).length + (isCorrect ? 1 : 0);

  return {
    position,
    isCorrect,
    correctOption,
    selectedOption,
    explanation: answer.question.explanation,
    points,
    speedBonus: breakdown.speedBonus,
    streakBonus: breakdown.streakBonus,
    streakAfter: isCorrect ? streakBefore + 1 : 0,
    isLast: index === run.answers.length - 1,
    runningScore,
    runningCorrect,
  };
}

// ---------------------------------------------------------------------------
// Turu bitirme
// ---------------------------------------------------------------------------

export interface FinishRunInput {
  userId: string;
  runId: string;
}

export async function finishRun({
  userId,
  runId,
}: FinishRunInput): Promise<RunSummary> {
  const run = await prisma.gameRun.findUnique({
    where: { id: runId },
    include: {
      category: { select: { name: true } },
      answers: {
        orderBy: { position: "asc" },
        include: {
          question: {
            select: {
              text: true,
              correctOption: true,
              explanation: true,
              difficulty: true,
            },
          },
        },
      },
      user: { select: { stats: { select: { xp: true, level: true } } } },
    },
  });

  if (!run) {
    throw new GameError("RUN_NOT_FOUND", "Böyle bir tur bulunamadı.");
  }
  if (run.userId !== userId) {
    throw new GameError("FORBIDDEN", "Bu tur size ait değil.");
  }

  const answered = run.answers.filter((answer) => answer.answered);
  const correctCount = answered.filter((answer) => answer.isCorrect).length;
  const wrongCount = answered.filter(
    (answer) => !answer.isCorrect && answer.selectedOption !== null,
  ).length;
  const skippedCount =
    answered.filter((answer) => !answer.isCorrect && answer.selectedOption === null)
      .length + (run.answers.length - answered.length);

  const score = answered.reduce((total, answer) => total + answer.points, 0);
  const durationMs = Math.max(
    Date.now() - run.startedAt.getTime(),
    0,
  );

  // En uzun ardışık doğru serisi (turdaki).
  let bestStreak = 0;
  let currentStreak = 0;
  for (const answer of run.answers) {
    if (answer.isCorrect) {
      currentStreak += 1;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  const isFirstFinalize = run.status === "IN_PROGRESS";
  const xpGained = xpForRun(score, correctCount);
  const previousXp = run.user.stats?.xp ?? 0;
  // Yeniden açılan sonuç sayfalarında aynı değerleri göstermek için
  // "öncesi" toplamı turun kazandırdığı XP'den geri hesaplıyoruz.
  const totalXpAfter = isFirstFinalize ? previousXp + xpGained : previousXp;
  const totalXpBefore = Math.max(totalXpAfter - xpGained, 0);
  const levelBefore = levelFromXp(totalXpBefore);
  const levelAfter = levelFromXp(totalXpAfter);

  const now = new Date();

  const { totalScore, isNewBest } = await prisma.$transaction(async (tx) => {
    if (run.status === "IN_PROGRESS") {
      await tx.gameRun.update({
        where: { id: run.id },
        data: {
          status: "COMPLETED",
          correctCount,
          wrongCount,
          skippedCount,
          score,
          bestStreak,
          durationMs,
          finishedAt: now,
        },
      });
    }

    const current = await tx.playerStats.findUnique({ where: { userId } });
    const nextTotalScore = (current?.totalScore ?? 0) + (run.status === "IN_PROGRESS" ? score : 0);
    const newBest = score > (current?.bestScore ?? 0);

    await tx.playerStats.upsert({
      where: { userId },
      create: {
        userId,
        totalScore: score,
        gamesPlayed: 1,
        questionsSeen: run.answers.length,
        correctAnswers: correctCount,
        bestScore: score,
        longestStreak: bestStreak,
        xp: xpGained,
        level: levelFromXp(xpGained),
        lastPlayedAt: now,
      },
      update: {
        totalScore: nextTotalScore,
        gamesPlayed: { increment: run.status === "IN_PROGRESS" ? 1 : 0 },
        questionsSeen: { increment: run.status === "IN_PROGRESS" ? run.answers.length : 0 },
        correctAnswers: { increment: run.status === "IN_PROGRESS" ? correctCount : 0 },
        bestScore: newBest ? score : (current?.bestScore ?? 0),
        longestStreak: Math.max(current?.longestStreak ?? 0, bestStreak),
        xp: { increment: run.status === "IN_PROGRESS" ? xpGained : 0 },
        level: levelFromXp((current?.xp ?? 0) + (run.status === "IN_PROGRESS" ? xpGained : 0)),
        lastPlayedAt: now,
      },
    });

    return { totalScore: nextTotalScore, isNewBest: newBest };
  });

  const missed: MissedQuestion[] = answered
    .filter((answer) => !answer.isCorrect)
    .map((answer) => ({
      position: answer.position,
      text: answer.question.text,
      correctOption: (asOptionKey(answer.question.correctOption) ?? "A") as OptionKey,
      selectedOption: asOptionKey(answer.selectedOption),
      explanation: answer.question.explanation,
    }));

  const percent = accuracy(correctCount, run.answers.length);

  return {
    runId: run.id,
    mode: run.mode as RunMode,
    categoryName: run.category?.name ?? null,
    score,
    totalQuestions: run.answers.length,
    correctCount,
    wrongCount,
    skippedCount,
    bestStreak,
    accuracy: percent,
    durationMs,
    xpGained,
    levelBefore,
    levelAfter,
    totalScore,
    totalXp: totalXpAfter,
    isNewBest,
    grade: gradeFor(percent),
    missed,
  };
}

/** Bitmiş turun özetini yeniden üretir (sonuç sayfası doğrudan açılırsa). */
export async function getSummary(
  runId: string,
  userId: string,
): Promise<RunSummary> {
  return finishRun({ userId, runId });
}
