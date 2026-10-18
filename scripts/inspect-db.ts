import "dotenv/config";

import { prisma } from "../src/lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, username: true, email: true, role: true },
  });
  console.log("Kullanıcılar:", users.length);
  console.table(users);

  const runs = await prisma.gameRun.findMany({
    select: {
      id: true,
      userId: true,
      mode: true,
      status: true,
      totalQuestions: true,
      score: true,
      startedAt: true,
      _count: { select: { answers: true } },
    },
    orderBy: { startedAt: "asc" },
  });
  console.log("Turlar:", runs.length);
  console.table(
    runs.map((run) => ({
      id: run.id.slice(-6),
      user: users.find((u) => u.id === run.userId)?.username ?? run.userId.slice(-4),
      mode: run.mode,
      status: run.status,
      totalQuestions: run.totalQuestions,
      answerRows: run._count.answers,
      score: run.score,
    })),
  );

  const answerCounts = await prisma.gameAnswer.groupBy({
    by: ["runId"],
    _count: { _all: true },
  });
  console.log("Cevap satırı sayıları:", answerCounts.map((row) => `${row.runId.slice(-6)}:${row._count._all}`).join(", "));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
