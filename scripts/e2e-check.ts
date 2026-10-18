import "dotenv/config";

/**
 * Uçtan uca doğrulama betiği (gerçek motor fonksiyonlarını kullanır).
 *
 * Çalıştırma: `npx.cmd tsx scripts/e2e-check.ts`
 *
 * Kapsam:
 *  1. Tur başlatma + soru listesi
 *  2. Cevap gönderme + sunucu tarafı puanlama
 *  3. Tur bitirme, PlayerStats oluşumu
 *  4. finishRun'ın idempotent olması (çift sayım yok)
 *  5. Sıralama (leaderboard) ve oyuncu sırası
 *  6. Günlük tur tekrar oynama koruması
 *  7. Yetki/yetkisizlik ve çift cevap korumaları
 */

import {
  GameError,
  answerQuestion,
  finishRun,
  getRunView,
  startRun,
} from "../src/lib/game";
import {
  countRankedPlayers,
  getGlobalLeaderboard,
  getPlayerRank,
} from "../src/lib/leaderboard";
import { prisma } from "../src/lib/prisma";

const USERNAME = "testoyuncu";

let passed = 0;
const failures: string[] = [];

function check(label: string, condition: boolean, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${label}${detail ? ` (${detail})` : ""}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL  ${label}${detail ? ` (${detail})` : ""}`);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function expectGameError(
  label: string,
  code: string,
  fn: () => Promise<unknown>,
) {
  try {
    await fn();
    check(label, false, "hata bekleniyordu ama başarılı oldu");
  } catch (error) {
    const actual = error instanceof GameError ? error.code : `BAŞKA:${typeof error}`;
    check(label, actual === code, `beklenen ${code}, gelen ${actual}`);
  }
}

const OPTIONS = ["A", "B", "C", "D"] as const;
type Option = (typeof OPTIONS)[number];

async function playFullRun(options: {
  userId: string;
  mode: "QUICK" | "DAILY";
  correctCount: number;
}) {
  const { runId } = await startRun({ userId: options.userId, mode: options.mode });
  const view = await getRunView(runId, options.userId);

  // Doğru cevapları bilmek için (yalnızca test amaçlı) doğrudan sorgula.
  const rows = await prisma.question.findMany({
    where: { id: { in: view.questions.map((question) => question.questionId) } },
    select: { id: true, correctOption: true },
  });
  const correctById = new Map(rows.map((row) => [row.id, row.correctOption as Option]));

  let intendedCorrect = 0;

  for (const question of view.questions) {
    const correctOption = correctById.get(question.questionId);
    if (!correctOption) throw new Error("Doğru cevap bulunamadı");

    const shouldBeCorrect = intendedCorrect < options.correctCount;
    if (shouldBeCorrect) intendedCorrect += 1;

    const selectedOption: Option = shouldBeCorrect
      ? correctOption
      : (OPTIONS.find((option) => option !== correctOption) as Option);

    await sleep(shouldBeCorrect ? 1500 : 700);

    const feedback = await answerQuestion({
      userId: options.userId,
      runId,
      position: question.position,
      selectedOption,
      clientTimeMs: shouldBeCorrect ? 1500 : 700,
    });

    if (feedback.isCorrect !== shouldBeCorrect) {
      throw new Error(
        `pos ${question.position}: beklenen doğruluk ${shouldBeCorrect}, motor ${feedback.isCorrect} dedi`,
      );
    }
    if (shouldBeCorrect && feedback.points <= 0) {
      throw new Error(`pos ${question.position}: doğru cevaba 0 puan`);
    }
    if (!shouldBeCorrect && feedback.points !== 0) {
      throw new Error(`pos ${question.position}: yanlış cevaba puan verildi`);
    }
  }

  const summary = await finishRun({ userId: options.userId, runId, });
  return { runId, summary };
}

async function main() {
  const user = await prisma.user.findUnique({
    where: { username: USERNAME },
    select: { id: true },
  });
  if (!user) throw new Error(`Test kullanıcısı bulunamadı: ${USERNAME}`);

  console.log("\n=== 1) Hızlı tur: başlat / cevapla / bitir ===");
  const { runId, summary } = await playFullRun({
    userId: user.id,
    mode: "QUICK",
    correctCount: 7,
  });

  check("10 soru soruldu", summary.totalQuestions === 10, `${summary.totalQuestions}`);
  check("7 doğru sayıldı", summary.correctCount === 7, `${summary.correctCount}`);
  check("3 yanlış sayıldı", summary.wrongCount === 3, `${summary.wrongCount}`);
  check("puan > 0", summary.score > 0, `${summary.score}`);
  check("isabet %70", Math.round(summary.accuracy) === 70, `%${summary.accuracy}`);
  check("XP kazanıldı", summary.xpGained > 0, `${summary.xpGained}`);
  check("yanlış sorular listesi 3 kayıt", summary.missed.length === 3);
  check(
    "her yanlışta doğru cevap + açıklama var",
    summary.missed.every((item) => item.correctOption && item.explanation),
  );
  check("seviye >= 1", summary.levelAfter >= 1, `Sv.${summary.levelAfter}`);

  console.log("\n=== 2) Bitmiş tur veritabanında tutarlı mı? ===");
  const dbRun = await prisma.gameRun.findUnique({
    where: { id: runId },
    select: {
      status: true,
      correctCount: true,
      wrongCount: true,
      score: true,
      bestStreak: true,
      finishedAt: true,
      durationMs: true,
    },
  });
  check("durum COMPLETED", dbRun?.status === "COMPLETED", String(dbRun?.status));
  check("DB puanı özetle aynı", dbRun?.score === summary.score, `${dbRun?.score}/${summary.score}`);
  check("bitiş zamanı yazıldı", Boolean(dbRun?.finishedAt));
  check("süre sıfırdan büyük", (dbRun?.durationMs ?? 0) > 0, `${dbRun?.durationMs}ms`);

  console.log("\n=== 3) finishRun idempotent mi? (çift sayım olmamalı) ===");
  const again = await finishRun({ userId: user.id, runId });
  check("ikinci çağrıda puan aynı", again.score === summary.score, `${again.score}`);
  check("ikinci çağrıda XP aynı", again.xpGained === summary.xpGained);
  check("ikinci çağrıda seviye aynı", again.levelAfter === summary.levelAfter);
  check("toplam puan değişmedi", again.totalScore === summary.totalScore, `${again.totalScore}`);

  console.log("\n=== 4) Oyuncu istatistikleri ===");
  const stats = await prisma.playerStats.findUnique({ where: { userId: user.id } });
  check("PlayerStats kaydı var", Boolean(stats));
  check("gamesPlayed === 1", stats?.gamesPlayed === 1, `${stats?.gamesPlayed}`);
  check("questionsSeen === 10", stats?.questionsSeen === 10, `${stats?.questionsSeen}`);
  check("correctAnswers === 7", stats?.correctAnswers === 7, `${stats?.correctAnswers}`);
  check("bestScore === tur puanı", stats?.bestScore === summary.score, `${stats?.bestScore}`);
  check("longestStreak > 0", (stats?.longestStreak ?? 0) > 0, `${stats?.longestStreak}`);
  check("totalScore === tur puanı", stats?.totalScore === summary.score, `${stats?.totalScore}`);

  console.log("\n=== 5) Sıralama ===");
  const board = await getGlobalLeaderboard({ limit: 10 });
  const ranked = await countRankedPlayers();
  const myRank = await getPlayerRank(user.id);
  check("sıralamada en az 1 oyuncu", board.length >= 1, `${board.length}`);
  check("sıralanan oyuncu sayısı >= 1", ranked >= 1, `${ranked}`);
  check("test oyuncusu listede", board.some((row) => row.userId === user.id));
  check("oyuncu sırası hesaplandı", myRank !== null && myRank >= 1, `#${myRank}`);
  check(
    "ilk satırın puanı en yüksek",
    board.length < 2 || board[0].totalScore >= board[1].totalScore,
  );
  check("sıralama 1'den başlıyor", board[0]?.rank === 1);

  console.log("\n=== 6) Günlük tur tekrar oynama koruması ===");
  await playFullRun({ userId: user.id, mode: "DAILY", correctCount: 10 });
  await expectGameError("aynı gün ikinci kez oynanamaz", "DAILY_ALREADY_PLAYED", () =>
    startRun({ userId: user.id, mode: "DAILY" }),
  );

  console.log("\n=== 7) Güvenlik / tutarlılık korumaları ===");
  await expectGameError("başka kullanıcının turu okunamaz", "FORBIDDEN", () =>
    getRunView(runId, "baska_kullanici_id"),
  );
  await expectGameError("cevaplanmış soru tekrar cevaplanamaz", "ALREADY_ANSWERED", async () => {
    const temp = await startRun({ userId: user.id, mode: "QUICK" });
    await answerQuestion({
      userId: user.id,
      runId: temp.runId,
      position: 0,
      selectedOption: "A",
      clientTimeMs: 500,
    });
    return answerQuestion({
      userId: user.id,
      runId: temp.runId,
      position: 0,
      selectedOption: "B",
      clientTimeMs: 500,
    });
  });
  await expectGameError("bitmiş tura cevap gönderilemez", "NOT_IN_PROGRESS", () =>
    answerQuestion({
      userId: user.id,
      runId,
      position: 0,
      selectedOption: "A",
      clientTimeMs: 100,
    }),
  );
  await expectGameError("olmayan tur okunamaz", "RUN_NOT_FOUND", () =>
    getRunView("olmayan_tur_id", user.id),
  );
  await expectGameError("düello modu kapalı", "NOT_ENOUGH_QUESTIONS", () =>
    startRun({ userId: user.id, mode: "DUEL" }),
  );

  console.log("\n=== 8) Süre kırpma (hız bonusu hilesi engeli) ===");
  const cheatRun = await startRun({ userId: user.id, mode: "QUICK" });
  // Hiç beklemeden 0 ms bildir: sunucu geçen süreyle kırpmalı, patlamamalı.
  const cheatFeedback = await answerQuestion({
    userId: user.id,
    runId: cheatRun.runId,
    position: 0,
    selectedOption: "A",
    clientTimeMs: 0,
  });
  check(
    "0 ms bildirimi güvenli işlendi",
    cheatFeedback.points >= 0 && Number.isFinite(cheatFeedback.points),
    `${cheatFeedback.points} puan`,
  );
  const cheatRow = await prisma.gameAnswer.findFirst({
    where: { runId: cheatRun.runId, position: 0 },
    select: { timeMs: true },
  });
  check(
    "kaydedilen süre 70000 ms sınırını aşmıyor",
    (cheatRow?.timeMs ?? 0) <= 70000,
    `${cheatRow?.timeMs}ms`,
  );
  // Test turunu temizle
  await prisma.gameRun.delete({ where: { id: cheatRun.runId } });

  console.log(`\n${"=".repeat(52)}`);
  console.log(`SONUÇ: ${passed} başarılı, ${failures.length} başarısız`);
  if (failures.length > 0) {
    console.log("\nBaşarısız kontroller:");
    for (const failure of failures) console.log(`  - ${failure}`);
    process.exitCode = 1;
  } else {
    console.log("Tüm kontroller geçti ✅");
  }
}

main()
  .catch((error) => {
    console.error("\nBetik çöktü:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
