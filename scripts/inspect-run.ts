import "dotenv/config";

import { prisma } from "../src/lib/prisma";

const runId = process.argv[2];

async function main() {
  const run = await prisma.gameRun.findUnique({
    where: { id: runId },
    include: {
      answers: { orderBy: { position: "asc" } },
    },
  });

  if (!run) {
    console.log("tur bulunamadı:", runId);
    return;
  }

  console.log("run", {
    id: run.id,
    mode: run.mode,
    status: run.status,
    total: run.totalQuestions,
    correct: run.correctCount,
    wrong: run.wrongCount,
    skipped: run.skippedCount,
    score: run.score,
    bestStreak: run.bestStreak,
    durationMs: run.durationMs,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
  });

  console.table(
    run.answers.map((answer) => ({
      pos: answer.position,
      answered: answer.answered,
      selected: answer.selectedOption,
      correct: answer.isCorrect,
      timeMs: answer.timeMs,
      points: answer.points,
      answeredAt: answer.answeredAt?.toISOString() ?? null,
    })),
  );

  const stats = await prisma.playerStats.findUnique({ where: { userId: run.userId } });
  console.log("stats", stats);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
