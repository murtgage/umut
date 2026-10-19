/**
 * Oyunun istemci ve sunucu arasında paylaşılan tipleri ve mod tanımları.
 * Bu dosya SAF olmalıdır: `prisma`, `next/headers` gibi sunucuya özel
 * modüller buradan import EDİLMEZ. Çünkü istemci bileşenleri de bu dosyayı
 * kullanır.
 */

export const RUN_MODES = [
  "QUICK",
  "CATEGORY",
  "DAILY",
  "REVIEW",
  "EXAM",
  "DUEL",
] as const;

export type RunMode = (typeof RUN_MODES)[number];

/** Yarım kalmış ve kaldığı yerden sürdürülebilecek tur. */
export interface ResumableRun {
  runId: string;
  mode: RunMode;
  /** Kategori / sınav adı (REVIEW için "Yanlışlarım"). */
  categoryName: string | null;
  answeredCount: number;
  totalQuestions: number;
}

export type OptionKey = "A" | "B" | "C" | "D";

export const OPTION_KEYS: OptionKey[] = ["A", "B", "C", "D"];

/** Üye olmadan oynayan bir misafirin tamamlayabileceği tur sayısı. */
export const GUEST_RUN_LIMIT = 5;

/** Tur başlatırken seçilebilen soru sayıları. */
export const QUESTION_COUNT_CHOICES = [10, 15, 20] as const;

export interface DifficultyChoice {
  /** 0 = karışık (filtre uygulanmaz), 1-3 = yalnızca o seviye. */
  value: 0 | 1 | 2 | 3;
  label: string;
}

/** Tur başlatırken seçilebilen zorluk seviyeleri. */
export const DIFFICULTY_CHOICES: DifficultyChoice[] = [
  { value: 0, label: "Karışık" },
  { value: 1, label: "Kolay" },
  { value: 2, label: "Orta" },
  { value: 3, label: "Zor" },
];

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
    label: "Karışık Tur",
    description:
      "Tüm derslerden rastgele 10 soru. Karma çalışmak ve genel seviyeni ölçmek için ideal.",
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
  REVIEW: {
    id: "REVIEW",
    label: "Yanlışlarım",
    description:
      "Daha önce yanlış yaptığın soruları tekrar çöz, açıklamalarla eksiklerini kapat.",
    tag: "tekrar",
    available: true,
  },
  EXAM: {
    id: "EXAM",
    label: "Sınav Turu",
    description:
      "Seçtiğin sınav bölümünün derslerinden karışık 10 soru (ör. Genel Yetenek).",
    tag: "10 soru",
    available: true,
  },
  DUEL: {
    id: "DUEL",
    label: "Karşılıklı Düello",
    description:
      "Arkadaşına bağlantı gönder, aynı sorularda yarışın. En yüksek puan kazanır.",
    tag: "rakip çağır",
    available: true,
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

/** Sonuç ekranında gösterilen, turdaki her sorunun ayrıntılı özeti. */
export interface QuestionReviewItem {
  position: number;
  text: string;
  options: { key: OptionKey; text: string }[];
  correctOption: OptionKey;
  selectedOption: OptionKey | null;
  isCorrect: boolean;
  /** Kullanıcı soruyu hiç cevaplamadıysa false. */
  answered: boolean;
  explanation: string | null;
  /** 1 = kolay, 2 = orta, 3 = zor. */
  difficulty: number;
  timeMs: number;
  points: number;
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
  /** Turdaki TÜM soruların dökümü (öğrenmek için). */
  review: QuestionReviewItem[];
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
