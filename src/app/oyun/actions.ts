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
  mode: z.enum(["QUICK", "CATEGORY", "DAILY", "REVIEW", "EXAM", "DUEL"]),
  categoryId: z.string().min(1).nullish(),
  /** EXAM modunda seçilen sınav bölümü (ör. "genel-yetenek"). */
  examType: z.string().min(1).max(60).nullish(),
});

export async function startRunAction(input: {
  mode: string;
  categoryId?: string | null;
  examType?: string | null;
}): Promise<ActionResult<{ runId: string }>> {
  try {
    const { session } = await requirePlayableSessionOrThrow();
    const parsed = startSchema.parse({
      mode: input.mode,
      categoryId: input.categoryId ?? null,
      examType: input.examType ?? null,
    });

    const { runId } = await startRun({
      userId: session.user.id,
      mode: parsed.mode,
      categoryId: parsed.categoryId ?? null,
      examType: parsed.examType ?? null,
    });

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

  let runId: string;

  try {
    const { session } = await requirePlayableSessionOrThrow();
    const parsed = startSchema.parse({ mode, categoryId: category, examType });
    const result = await startRun({
      userId: session.user.id,
      mode: parsed.mode,
      categoryId: parsed.categoryId ?? null,
      examType: parsed.examType ?? null,
    });
    runId = result.runId;
  } catch (error) {
    const message = toActionError(error);
    redirect(`/oyna?hata=${encodeURIComponent(message)}`);
  }

  redirect(`/oyun/${runId}`);
}
