-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "username" TEXT,
    "displayUsername" TEXT,
    "role" TEXT DEFAULT 'PLAYER'
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expiresAt" DATETIME NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" DATETIME,
    "refreshTokenExpiresAt" DATETIME,
    "scope" TEXT,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "optionA" TEXT NOT NULL,
    "optionB" TEXT NOT NULL,
    "optionC" TEXT NOT NULL,
    "optionD" TEXT NOT NULL,
    "correctOption" TEXT NOT NULL,
    "explanation" TEXT,
    "difficulty" INTEGER NOT NULL DEFAULT 2,
    "topic" TEXT,
    "source" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "question_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "game_run" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'QUICK',
    "categoryId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "totalQuestions" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "wrongCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    CONSTRAINT "game_run_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "game_run_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "game_answer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "selectedOption" TEXT,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "timeMs" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "answeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "game_answer_runId_fkey" FOREIGN KEY ("runId") REFERENCES "game_run" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "game_answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "player_stats" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "gamesWon" INTEGER NOT NULL DEFAULT 0,
    "questionsSeen" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "bestScore" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "lastPlayedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "player_stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "category_slug_key" ON "category"("slug");

-- CreateIndex
CREATE INDEX "question_categoryId_idx" ON "question"("categoryId");

-- CreateIndex
CREATE INDEX "question_difficulty_idx" ON "question"("difficulty");

-- CreateIndex
CREATE INDEX "game_run_userId_status_idx" ON "game_run"("userId", "status");

-- CreateIndex
CREATE INDEX "game_run_score_idx" ON "game_run"("score");

-- CreateIndex
CREATE INDEX "game_answer_questionId_idx" ON "game_answer"("questionId");

-- CreateIndex
CREATE INDEX "game_answer_runId_idx" ON "game_answer"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "game_answer_runId_position_key" ON "game_answer"("runId", "position");

-- CreateIndex
CREATE INDEX "player_stats_totalScore_idx" ON "player_stats"("totalScore");

-- CreateIndex
CREATE INDEX "player_stats_xp_idx" ON "player_stats"("xp");
