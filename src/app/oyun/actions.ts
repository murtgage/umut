"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  GameError,
  answerQuestion,
  finishRun,
  startRun,
} from "@/lib/game";
import type { AnswerFeedback, RunSummary } from "@/lib/game-types";
import { createDuel, joinDuel } from "@/lib/duel";
import {
  requirePlayableSessionOrThrow,
  requireSessionOrThrow,
} from "@/lib/session";

/**
 * Sunucu eylemlerinin ortak sonuç tipi. Hata mesajları kullanıcıya doğrudan
 * gösterilebilir (Türkçe).
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function toActionError(error: unknown): string {
  if (error instanceof GameError) return error.message;
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Geçersiz istek.";
  }
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return "Bu işlem için giriş yapmalısın.";
  }
  if (error instanceof Error && error.message === "EMAIL_NOT_VERIFIED") {
    return "Oyuna başlamadan önce e-posta adresini doğrulamalısın.";
  }
  console.error("[oyun] beklenmeyen hata:", error);
  return "Beklenmeyen bir hata oluştu. Lütfen tekrar dene.";
}

const startSchema = z.object({
  mode: z.enum(["QUICK", "CATEGORY", "DAILY", "REVIEW", "EXAM"]),
  categoryId: z.string().min(1).nullish(),
  /** EXAM modunda seçilen sınav bölümü (ör. "genel-yetenek"). */
  examType: z.string().min(1).max(60).nullish(),
  /** Tur uzunluğu (5-30 arası; varsayılan sunucudaki QUESTIONS_PER_RUN). */
  questionCount: z.number().int().min(5).max(30).nullish(),
  /** 0 = karışık, 1 = kolay, 2 = orta, 3 = zor. */
  difficulty: z.number().int().min(0).max(3).nullish(),
});

export async function startRunAction(input: {
  mode: string;
  categoryId?: string | null;
  examType?: string | null;
  questionCount?: number | null;
  difficulty?: number | null;
}): Promise<ActionResult<{ runId: string }>> {
  try {
    const { session } = await requirePlayableSessionOrThrow();
    const parsed = startSchema.parse({
      mode: input.mode,
      categoryId: input.categoryId ?? null,
      examType: input.examType ?? null,
      questionCount: input.questionCount ?? null,
      difficulty: input.difficulty ?? null,
    });

    const { runId } = await startRun({
      userId: session.user.id,
      mode: parsed.mode,
      categoryId: parsed.categoryId ?? null,
      examType: parsed.examType ?? null,
      questionCount: parsed.questionCount ?? undefined,
      difficulty: parsed.difficulty ?? 0,
    });

    revalidatePath("/oyna");
    return { ok: true, data: { runId } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

// ---------------------------------------------------------------------------
// Düello (karşılıklı yarış) — genel startRunAction üzerinden AÇILMAZ; sorular
// rakiple birebir aynı olmak zorunda olduğundan src/lib/duel.ts üzerinden açılır.
// ---------------------------------------------------------------------------

const duelStartSchema = z.object({
  questionCount: z.number().int().min(5).max(30).nullish(),
  difficulty: z.number().int().min(0).max(3).nullish(),
});

/** Düello oluşturur ve davet bağlantısı için düello kimliğini döndürür. */
export async function startDuelAction(input: {
  questionCount?: number | null;
  difficulty?: number | null;
}): Promise<ActionResult<{ duelId: string }>> {
  try {
    const { session } = await requirePlayableSessionOrThrow();
    const parsed = duelStartSchema.parse({
      questionCount: input.questionCount ?? null,
      difficulty: input.difficulty ?? null,
    });

    const { duelId } = await createDuel({
      userId: session.user.id,
      questionCount: parsed.questionCount ?? undefined,
      difficulty: parsed.difficulty ?? 0,
    });

    revalidatePath("/oyna");
    return { ok: true, data: { duelId } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

/** Davet bağlantısıyla düelloya katılır ve kendi turunun kimliğini döndürür. */
export async function joinDuelAction(input: {
  duelId: string;
}): Promise<ActionResult<{ runId: string }>> {
  try {
    const { session } = await requirePlayableSessionOrThrow();
    const duelId = z.string().min(1).parse(input.duelId);

    const { runId } = await joinDuel({ duelId, userId: session.user.id });

    revalidatePath("/oyna");
    return { ok: true, data: { runId } };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

const answerSchema = z.object({
  runId: z.string().min(1),
  position: z.number().int().min(0).max(199),
  selectedOption: z.enum(["A", "B", "C", "D"]).nullable(),
  clientTimeMs: z.number().int().min(0).max(600_000),
});

export async function answerAction(input: {
  runId: string;
  position: number;
  selectedOption: "A" | "B" | "C" | "D" | null;
  clientTimeMs: number;
}): Promise<ActionResult<AnswerFeedback>> {
  try {
    const session = await requireSessionOrThrow();
    const parsed = answerSchema.parse(input);

    const feedback = await answerQuestion({
      userId: session.user.id,
      ...parsed,
    });

    return { ok: true, data: feedback };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function finishAction(input: {
  runId: string;
}): Promise<ActionResult<RunSummary>> {
  try {
    const session = await requireSessionOrThrow();
    const runId = z.string().min(1).parse(input.runId);

    const summary = await finishRun({ userId: session.user.id, runId });

    revalidatePath("/profil");
    revalidatePath("/siralama");
    revalidatePath("/oyna");
    return { ok: true, data: summary };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

// ---------------------------------------------------------------------------
// Form tabanlı tur başlatma (JavaScript olmadan da çalışır)
// ---------------------------------------------------------------------------

export async function startRunFormAction(formData: FormData): Promise<void> {
  const mode = String(formData.get("mode") ?? "QUICK");
  const categoryId = formData.get("categoryId");
  const category = typeof categoryId === "string" && categoryId.length > 0 ? categoryId : null;
  const examTypeValue = formData.get("examType");
  const examType =
    typeof examTypeValue === "string" && examTypeValue.length > 0
      ? examTypeValue
      : null;

  // Soru sayısı ve zorluk, form alanlarından (metin olarak) okunur.
  const questionCountValue = formData.get("questionCount");
  const questionCount =
    typeof questionCountValue === "string" && questionCountValue.length > 0
      ? Number(questionCountValue)
      : null;
  const difficultyValue = formData.get("difficulty");
  const difficulty =
    typeof difficultyValue === "string" && difficultyValue.length > 0
      ? Number(difficultyValue)
      : null;

  let runId: string;

  try {
    const { session } = await requirePlayableSessionOrThrow();
    const parsed = startSchema.parse({
      mode,
      categoryId: category,
      examType,
      questionCount,
      difficulty,
    });
    const result = await startRun({
      userId: session.user.id,
      mode: parsed.mode,
      categoryId: parsed.categoryId ?? null,
      examType: parsed.examType ?? null,
      questionCount: parsed.questionCount ?? undefined,
      difficulty: parsed.difficulty ?? 0,
    });
    runId = result.runId;
  } catch (error) {
    const message = toActionError(error);
    redirect(`/oyna?hata=${encodeURIComponent(message)}`);
  }

  redirect(`/oyun/${runId}`);
}
