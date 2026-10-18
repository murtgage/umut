-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_game_answer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "selectedOption" TEXT,
    "answered" BOOLEAN NOT NULL DEFAULT false,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "timeMs" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "answeredAt" DATETIME,
    CONSTRAINT "game_answer_runId_fkey" FOREIGN KEY ("runId") REFERENCES "game_run" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "game_answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_game_answer" ("answeredAt", "id", "isCorrect", "points", "position", "questionId", "runId", "selectedOption", "timeMs") SELECT "answeredAt", "id", "isCorrect", "points", "position", "questionId", "runId", "selectedOption", "timeMs" FROM "game_answer";
DROP TABLE "game_answer";
ALTER TABLE "new_game_answer" RENAME TO "game_answer";
CREATE INDEX "game_answer_questionId_idx" ON "game_answer"("questionId");
CREATE INDEX "game_answer_runId_idx" ON "game_answer"("runId");
CREATE UNIQUE INDEX "game_answer_runId_position_key" ON "game_answer"("runId", "position");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
