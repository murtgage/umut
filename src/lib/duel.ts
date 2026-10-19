import { GameError, startRun } from "@/lib/game";
import { prisma } from "@/lib/prisma";

/**
 * Düello modu.
 *
 * Akış:
 *  1. Davetçi "Düello" der → bir tur açılır ve düello kaydı oluşur.
 *  2. Davetçi arkadaşına düello bağlantısını gönderir.
 *  3. Rakip bağlantıya girer, "Katıl" der → aynı sorular aynı sırada açılır.
 *  4. İki taraf da bitirir → puan karşılaştırması düello sayfasında görünür.
 */

/** Düello davetinin geçerlilik süresi (7 gün). */
export const DUEL_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Kullanıcının düellodaki konumu. */
export type DuelRole = "CHALLENGER" | "OPPONENT" | "GUEST";

/** Düello sonucunun kazananı. */
export type DuelWinner = "CHALLENGER" | "OPPONENT" | "TIE";

export interface DuelPlayerView {
  userId: string;
  name: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  bestStreak: number;
  durationMs: number;
  /** Tur tamamlandı mı. */
  finished: boolean;
  /** Görüntüleyen kişi bu oyuncu mu. */
  isCurrentUser: boolean;
}

export interface DuelView {
  id: string;
  status: string;
  questionCount: number;
  createdAt: string;
  expiresAt: string;
  role: DuelRole;
  /** Kullanıcının bu düellodaki turu (yoksa null). */
  myRunId: string | null;
  /** Kullanıcının turu bitti mi. */
  myRunFinished: boolean;
  opponentJoined: boolean;
  /** İki taraf da turu bitirdi mi. */
  finished: boolean;
  winner: DuelWinner | null;
  challenger: DuelPlayerView;
  opponent: DuelPlayerView | null;
}

export interface CreateDuelInput {
  userId: string;
  questionCount?: number;
  /** 0 = karışık, 1 = kolay, 2 = orta, 3 = zor. */
  difficulty?: number | null;
}

/**
 * Yeni bir düello açar. Aynı kullanıcının hâlâ rakipsiz ve oynanmamış bir
 * düellosu varsa onu yeniden kullanır (çift düello birikmesini önler).
 */
export async function createDuel({
  userId,
  questionCount = 10,
  difficulty = 0,
}: CreateDuelInput): Promise<{ duelId: string; runId: string }> {
  const reusable = await prisma.duel.findFirst({
    where: {
      challengerId: userId,
      opponentId: null,
      status: "OPEN",
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (reusable?.challengerRunId) {
    const run = await prisma.gameRun.findUnique({
      where: { id: reusable.challengerRunId },
      select: { id: true, status: true },
    });
    if (run && run.status === "IN_PROGRESS") {
      return { duelId: reusable.id, runId: run.id };
    }
  }

  const { runId, questionIds } = await startRun({
    userId,
    mode: "DUEL",
    questionCount,
    difficulty,
  });

  const duel = await prisma.duel.create({
    data: {
      challengerId: userId,
      challengerRunId: runId,
      questionCount: questionIds.length,
      expiresAt: new Date(Date.now() + DUEL_TTL_MS),
    },
  });

  return { duelId: duel.id, runId };
}

/** Rakip, düelloya katılır ve aynı sorularla kendi turunu açar. */
export async function joinDuel({
  duelId,
  userId,
}: {
  duelId: string;
  userId: string;
}): Promise<{ runId: string }> {
  const duel = await prisma.duel.findUnique({ where: { id: duelId } });
  if (!duel) {
    throw new GameError("DUEL_NOT_FOUND", "Düello bulunamadı.");
  }
  if (duel.expiresAt.getTime() <= Date.now()) {
    throw new GameError("DUEL_EXPIRED", "Bu düellonun süresi dolmuş.");
  }
  if (duel.challengerId === userId) {
    throw new GameError(
      "DUEL_SELF",
      "Kendi düellona katılamazsın — bağlantıyı arkadaşına gönder.",
    );
  }
  if (duel.opponentId) {
    if (duel.opponentId === userId && duel.opponentRunId) {
      return { runId: duel.opponentRunId };
    }
    throw new GameError(
      "DUEL_JOINED",
      "Bu düelloya başka bir arkadaş katıldı.",
    );
  }
  if (!duel.challengerRunId) {
    throw new GameError("DUEL_NOT_FOUND", "Düello soruları hazır değil.");
  }

  const answers = await prisma.gameAnswer.findMany({
    where: { runId: duel.challengerRunId },
    orderBy: { position: "asc" },
    select: { questionId: true },
  });
  if (answers.length === 0) {
    throw new GameError("DUEL_NOT_FOUND", "Düello soruları bulunamadı.");
  }

  const { runId } = await startRun({
    userId,
    mode: "DUEL",
    questionIds: answers.map((row) => row.questionId),
  });

  await prisma.duel.update({
    where: { id: duelId },
    data: { opponentId: userId, opponentRunId: runId, status: "JOINED" },
  });

  return { runId };
}

/** Düelloyu okur; karşılaştırma için iki tarafın da özetini döndürür. */
export async function getDuelView(
  duelId: string,
  userId: string | null,
): Promise<DuelView | null> {
  const duel = await prisma.duel.findUnique({
    where: { id: duelId },
    include: {
      challenger: { select: { id: true, name: true } },
      opponent: { select: { id: true, name: true } },
    },
  });
  if (!duel) return null;

  const runIds = [duel.challengerRunId, duel.opponentRunId].filter(
    (id): id is string => Boolean(id),
  );
  const runs = await prisma.gameRun.findMany({
    where: { id: { in: runIds } },
    select: {
      id: true,
      status: true,
      score: true,
      correctCount: true,
      wrongCount: true,
      skippedCount: true,
      bestStreak: true,
      durationMs: true,
    },
  });
  const runById = new Map(runs.map((run) => [run.id, run]));

  const toPlayer = (
    user: { id: string; name: string },
    runId: string | null,
  ): DuelPlayerView => {
    const run = runId ? runById.get(runId) : undefined;
    return {
      userId: user.id,
      name: user.name,
      score: run?.score ?? 0,
      correctCount: run?.correctCount ?? 0,
      wrongCount: run?.wrongCount ?? 0,
      skippedCount: run?.skippedCount ?? 0,
      bestStreak: run?.bestStreak ?? 0,
      durationMs: run?.durationMs ?? 0,
      finished: run?.status === "COMPLETED",
      isCurrentUser: user.id === userId,
    };
  };

  const challenger = toPlayer(duel.challenger, duel.challengerRunId);
  const opponent = duel.opponent
    ? toPlayer(duel.opponent, duel.opponentRunId)
    : null;

  const role: DuelRole =
    userId && userId === duel.challengerId
      ? "CHALLENGER"
      : userId && userId === duel.opponentId
        ? "OPPONENT"
        : "GUEST";

  const myRunId =
    role === "CHALLENGER"
      ? duel.challengerRunId
      : role === "OPPONENT"
        ? duel.opponentRunId
        : null;
  const myRun = myRunId ? runById.get(myRunId) : undefined;

  const finished = challenger.finished && Boolean(opponent?.finished);

  let winner: DuelWinner | null = null;
  if (finished && opponent) {
    if (challenger.score > opponent.score) winner = "CHALLENGER";
    else if (opponent.score > challenger.score) winner = "OPPONENT";
    else winner = "TIE";
  }

  // İkisi de bitirdiyse kayıt kalıcı olarak "bitmiş" işaretlenir.
  if (finished && duel.status !== "FINISHED") {
    await prisma.duel.update({
      where: { id: duel.id },
      data: { status: "FINISHED" },
    });
  }

  return {
    id: duel.id,
    status: finished ? "FINISHED" : duel.status,
    questionCount: duel.questionCount,
    createdAt: duel.createdAt.toISOString(),
    expiresAt: duel.expiresAt.toISOString(),
    role,
    myRunId,
    myRunFinished: myRun?.status === "COMPLETED",
    opponentJoined: Boolean(opponent),
    finished,
    winner,
    challenger,
    opponent,
  };
}

/** Bir turun hangi düelloya ait olduğunu bulur (sonuç ekranı için). */
export async function findDuelByRunId(runId: string): Promise<string | null> {
  const duel = await prisma.duel.findFirst({
    where: { OR: [{ challengerRunId: runId }, { opponentRunId: runId }] },
    select: { id: true },
  });
  return duel?.id ?? null;
}
