/**
 * Umut — sınav türleri (KPSS bölümleri).
 *
 * Bu dosya SAF olmalıdır: `prisma`, `next/headers` gibi sunucuya özel modüller
 * buradan import EDİLMEZ. Kategori slug'ları `prisma/seed-categories.ts` ile
 * birebir uyumludur.
 *
 * Amaç: Oyuncu tura başlamadan önce hangi sınav bölümünden sorulacağını seçer.
 * Örneğin "Genel Yetenek" ile "Eğitim Bilimleri" aynı havuz değildir.
 */

export interface ExamType {
  slug: string;
  name: string;
  /** Kısa etiket (buton ve rozetlerde kullanılır). */
  short: string;
  description: string;
  /** Görsel ipucu (emoji — kategori ikonlarından bağımsız tutulur). */
  icon: string;
  /**
   * Bu sınav türüne giren ders slug'ları.
   * BOŞ dizi "tüm dersler" anlamına gelir (Karışık).
   */
  categorySlugs: string[];
}

export const EXAM_TYPES: ExamType[] = [
  {
    slug: "genel-yetenek",
    name: "Genel Yetenek",
    short: "GY",
    description: "Türkçe, Matematik ve Geometri soruları.",
    icon: "🧩",
    categorySlugs: ["turkce", "matematik", "geometri"],
  },
  {
    slug: "genel-kultur",
    name: "Genel Kültür",
    short: "GK",
    description: "Tarih, Coğrafya, Vatandaşlık ve Güncel Bilgiler soruları.",
    icon: "🏛️",
    categorySlugs: ["tarih", "cografya", "vatandaslik", "guncel"],
  },
  {
    slug: "egitim-bilimleri",
    name: "Eğitim Bilimleri",
    short: "EĞİTİM",
    description:
      "Gelişim, Öğrenme, Program, Ölçme, Rehberlik, Öğretim, Sınıf Yönetimi, Öğretim Teknolojileri ve Özel Eğitim.",
    icon: "🎓",
    categorySlugs: [
      "egitim-gelisim",
      "egitim-ogrenme",
      "egitim-program",
      "egitim-olcme",
      "egitim-rehberlik",
      "egitim-ogretim",
      "egitim-sinif",
      "egitim-teknoloji",
      "egitim-ozel",
    ],
  },
  {
    slug: "karisik",
    name: "Karışık",
    short: "TÜMÜ",
    description: "Bütün derslerden rastgele sorular. Genel seviyeni ölçmek için.",
    icon: "🎲",
    categorySlugs: [],
  },
];

export const EXAM_TYPE_SLUGS: string[] = EXAM_TYPES.map((exam) => exam.slug);

export function isExamTypeSlug(value: string): boolean {
  return EXAM_TYPE_SLUGS.includes(value);
}

export function examTypeBySlug(
  value: string | null | undefined,
): ExamType | null {
  if (!value) return null;
  return EXAM_TYPES.find((exam) => exam.slug === value) ?? null;
}

/** Geçersiz/boş değerde `null` yerine okunabilir bir ad döner. */
export function examTypeName(value: string | null | undefined): string | null {
  return examTypeBySlug(value)?.name ?? null;
}
