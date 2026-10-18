/**
 * Oyunun istemci ve sunucu arasında paylaşılan tipleri ve mod tanımları.
 * Bu dosya SAF olmalıdır: `prisma`, `next/headers` gibi sunucuya özel
 * modüller buradan import EDİLMEZ. Çünkü istemci bileşenleri de bu dosyayı
 * kullanır.
 */

export const RUN_MODES = ["QUICK", "CATEGORY", "DAILY", "DUEL"] as const;

export type RunMode = (typeof RUN_MODES)[number];

export type OptionKey = "A" | "B" | "C" | "D";

export const OPTION_KEYS: OptionKey[] = ["A", "B", "C", "D"];

/** Oyuncunun görebileceği soru biçimi — doğru cevap ASLA yer almaz. */
export interface RunQuestion {
  position: number;
  questionId: string;
  text: string;
  options: { key: OptionKey; text: string }[];
  difficulty: number;
  topic: string | null;
  categoryName: string;
}

export interface ModeInfo {
  id: RunMode;
  label: string;
  description: string;
  /** Kısa etiket (kart üstü) */
  tag: string;
  available: boolean;
}

export const MODE_INFO: Record<RunMode, ModeInfo> = {
  QUICK: {
    id: "QUICK",
    label: "Hızlı Tur",
    description:
      "Tüm kategorilerden rastgele 10 soru. Karma çalışmak ve genel seviyeni ölçmek için ideal.",
    tag: "10 soru",
    available: true,
  },
  CATEGORY: {
    id: "CATEGORY",
    label: "Kategori Turu",
    description:
      "Tek bir derse odaklan: Türkçe, Matematik, Tarih, Vatandaşlık ve daha fazlası.",
    tag: "10 soru",
    available: true,
  },
  DAILY: {
    id: "DAILY",
    label: "Günlük Meydan Okuma",
    description:
      "Herkes için aynı 10 soru, günde bir kez. Kendini Türkiye geneliyle kıyasla.",
    tag: "günde 1",
    available: true,
  },
  DUEL: {
    id: "DUEL",
    label: "Karşılıklı Düello",
    description:
      "Gerçek bir rakiple aynı anda yarış. Eşleştirme ve canlı skor yolda.",
    tag: "yakında",
    available: false,
  },
};

/** Yanlış cevaplanan / boş bırakılan soru için arayüzde gösterilen özet. */
export interface MissedQuestion {
  position: number;
  text: string;
  correctOption: OptionKey;
  selectedOption: OptionKey | null;
  explanation: string | null;
}

export interface AnswerFeedback {
  position: number;
  isCorrect: boolean;
  correctOption: OptionKey;
  selectedOption: OptionKey | null;
  explanation: string | null;
  points: number;
  speedBonus: number;
  streakBonus: number;
  streakAfter: number;
  isLast: boolean;
  runningScore: number;
  runningCorrect: number;
}

export interface RunSummary {
  runId: string;
  mode: RunMode;
  categoryName: string | null;
  score: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  bestStreak: number;
  /** Yüzde (0-100) */
  accuracy: number;
  durationMs: number;
  xpGained: number;
  levelBefore: number;
  levelAfter: number;
  totalScore: number;
  /** Tur sonrası oyuncunun toplam XP'si (seviye çubuğu için). */
  totalXp: number;
  isNewBest: boolean;
  grade: { label: string; tone: string };
  missed: MissedQuestion[];
}

/** Tur içinde verilmiş bir cevabın özeti (devam eden turu geri yüklemek için). */
export interface AnsweredSummary {
  position: number;
  selectedOption: OptionKey | null;
  isCorrect: boolean;
  correctOption: OptionKey;
  explanation: string | null;
  points: number;
}

/** Devam eden ya da bitmiş bir turun tam görünümü. */
export interface RunView {
  runId: string;
  mode: RunMode;
  status: string;
  categoryName: string | null;
  totalQuestions: number;
  score: number;
  correctCount: number;
  questions: RunQuestion[];
  answered: AnsweredSummary[];
}
