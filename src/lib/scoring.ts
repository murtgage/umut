/**
 * Umut — puanlama kuralları.
 *
 * Tek kaynak doğru (single source of truth): hem sunucu (skoru otoriter olarak
 * hesaplar) hem arayüz (canlı geri bildirim) bu fonksiyonları kullanır.
 * Bu dosya saf (pure) olmalıdır - sunucuya özel import içermez.
 */

/** Tek soru için verilen süre (ms). */
export const QUESTION_TIME_MS = 30_000;

/** Doğru cevabın temel puanı. */
export const BASE_POINTS = 100;

/** Hız bonusunun üst sınırı. Kalan süreyle doğru orantılıdır. */
export const MAX_SPEED_BONUS = 100;

/** Her ek doğru cevap (seri) için eklenen puan. */
export const STREAK_STEP = 20;

/** Seri bonusunun üst sınırı. */
export const MAX_STREAK_BONUS = 100;

/** Bir turda sorulacak soru sayısı. */
export const QUESTIONS_PER_RUN = 10;

/** Zorluk çarpanı: 1 kolay, 2 orta, 3 zor. */
export const DIFFICULTY_MULTIPLIER: Record<number, number> = {
  1: 1,
  2: 1.25,
  3: 1.5,
};

export const DIFFICULTY_LABEL: Record<number, string> = {
  1: "Kolay",
  2: "Orta",
  3: "Zor",
};

export type AnswerKind = "correct" | "wrong" | "timeout" | "skipped";

export interface ScoreInput {
  /** Cevap doğru mu? */
  isCorrect: boolean;
  /** Soruya harcanan süre (ms). Negatif veya süreden büyük değerler kırpılır. */
  timeMs: number;
  /** Sorunun zorluğu (1-3). */
  difficulty: number;
  /** Bu cevaptan ÖNCEKİ ardışık doğru sayısı. */
  streakBefore: number;
}

export interface ScoreResult {
  points: number;
  streakBonus: number;
  speedBonus: number;
  multiplier: number;
}

/**
 * Tek bir cevabın puanını hesaplar.
 * Yanlış / boş / süresi dolmuş cevaplar 0 puan alır ve seriyi sıfırlar.
 */
export function scoreAnswer({
  isCorrect,
  timeMs,
  difficulty,
  streakBefore,
}: ScoreInput): ScoreResult {
  if (!isCorrect) {
    return { points: 0, streakBonus: 0, speedBonus: 0, multiplier: 1 };
  }

  const multiplier = DIFFICULTY_MULTIPLIER[difficulty] ?? 1;

  const clampedTime = Math.min(Math.max(timeMs, 0), QUESTION_TIME_MS);
  const remainingRatio = (QUESTION_TIME_MS - clampedTime) / QUESTION_TIME_MS;
  const speedBonus = Math.round(MAX_SPEED_BONUS * remainingRatio);

  const streakBonus =
    Math.min(Math.max(streakBefore, 0) * STREAK_STEP, MAX_STREAK_BONUS) * (streakBefore > 0 ? 1 : 0);

  const points = Math.round((BASE_POINTS + speedBonus) * multiplier) + streakBonus;

  return { points, streakBonus, speedBonus, multiplier };
}

/** Bir cevap için puan (kısayol). */
export function pointsForAnswer(input: ScoreInput): number {
  return scoreAnswer(input).points;
}

/** Turun başarı oranı (0-100). */
export function accuracy(correctCount: number, totalQuestions: number): number {
  if (totalQuestions <= 0) return 0;
  return Math.round((correctCount / totalQuestions) * 100);
}

/** Sonuca göre oyuncuya verilecek derece/etiket. */
export function gradeFor(percent: number): { label: string; tone: string } {
  // Açık tema: 300 tonları beyaz zeminde okunmaz, 600 tonları kullanılır.
  if (percent >= 90) return { label: "Efsane", tone: "text-amber-600" };
  if (percent >= 75) return { label: "Uzman", tone: "text-emerald-600" };
  if (percent >= 60) return { label: "Yetkin", tone: "text-sky-600" };
  if (percent >= 40) return { label: "Gelişiyor", tone: "text-violet-600" };
  return { label: "Yeni Başlayan", tone: "text-rose-600" };
}

// --- Tecrübe puanı (XP) ve seviye -----------------------------------------

/** Seviye atlamak için gereken XP. Sabit tutuldu: öngörülebilir ilerleme. */
export const XP_PER_LEVEL = 500;

/** Bir turun kazandırdığı XP. */
export function xpForRun(score: number, correctCount: number): number {
  return Math.round(score / 10) + correctCount * 5;
}

export function levelFromXp(xp: number): number {
  return Math.floor(Math.max(xp, 0) / XP_PER_LEVEL) + 1;
}

export interface LevelProgress {
  level: number;
  into: number;
  need: number;
  percent: number;
}

export function levelProgress(xp: number): LevelProgress {
  const safeXp = Math.max(xp, 0);
  const level = levelFromXp(safeXp);
  const into = safeXp % XP_PER_LEVEL;
  return {
    level,
    into,
    need: XP_PER_LEVEL,
    percent: Math.round((into / XP_PER_LEVEL) * 100),
  };
}
