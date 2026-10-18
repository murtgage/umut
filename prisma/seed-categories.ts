/**
 * Umut — soru bankası kategorilerinin tek doğruluk kaynağı (canonical).
 *
 * Bu liste hem `scripts/validate-questions.ts` (üretilen soruların kategori
 * adlarını doğrular) hem `scripts/merge-questions.ts` (nihai
 * `questions.json` dosyasının `categories` bloğunu yazar) tarafından kullanılır.
 *
 * KPSS bölümleri:
 *  - Genel Yetenek  : Türkçe, Matematik, Geometri
 *  - Genel Kültür   : Tarih, Coğrafya, Vatandaşlık, Güncel Bilgiler
 *  - Eğitim Bilimleri: 9 alt alan
 *
 * `icon` alanı `src/components/category-icon.tsx` içindeki Lucide eşlemesiyle
 * birebir uyumlu olmalıdır.
 */

export interface SeedCategory {
  slug: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  sortOrder: number;
}

export const SEED_CATEGORIES: SeedCategory[] = [
  {
    slug: "turkce",
    name: "Türkçe",
    description: "Sözcükte anlam, cümle bilgisi, paragraf, yazım ve noktalama.",
    color: "#ef4444",
    icon: "book-open",
    sortOrder: 1,
  },
  {
    slug: "matematik",
    name: "Matematik",
    description: "Temel işlemler, denklemler, problemler, oran-orantı, olasılık.",
    color: "#3b82f6",
    icon: "calculator",
    sortOrder: 2,
  },
  {
    slug: "geometri",
    name: "Geometri",
    description: "Açılar, üçgenler, dörtgenler, çember, alan ve hacim.",
    color: "#8b5cf6",
    icon: "shapes",
    sortOrder: 3,
  },
  {
    slug: "tarih",
    name: "Tarih",
    description: "Osmanlı, Kurtuluş Savaşı, Cumhuriyet dönemi ve Atatürk ilkeleri.",
    color: "#f59e0b",
    icon: "landmark",
    sortOrder: 4,
  },
  {
    slug: "cografya",
    name: "Coğrafya",
    description: "Türkiye'nin coğrafi özellikleri, iklim, nüfus ve ekonomik coğrafya.",
    color: "#22c55e",
    icon: "globe",
    sortOrder: 5,
  },
  {
    slug: "vatandaslik",
    name: "Vatandaşlık ve Temel Hukuk",
    description: "Anayasa, temel hukuk kavramları, yasama-yürütme-yargı.",
    color: "#14b8a6",
    icon: "scale",
    sortOrder: 6,
  },
  {
    slug: "guncel",
    name: "Güncel Bilgiler",
    description: "Türkiye ve dünya gündemi, uluslararası kuruluşlar, güncel olaylar.",
    color: "#ec4899",
    icon: "newspaper",
    sortOrder: 7,
  },
  {
    slug: "egitim-gelisim",
    name: "Gelişim Psikolojisi",
    description: "Gelişim ilkeleri, dönemler, Piaget, Erikson, Kohlberg.",
    color: "#a855f7",
    icon: "brain",
    sortOrder: 8,
  },
  {
    slug: "egitim-ogrenme",
    name: "Öğrenme Psikolojisi",
    description: "Klasik ve edimsel koşullanma, bilişsel kuramlar, bellek, güdülenme.",
    color: "#06b6d4",
    icon: "lightbulb",
    sortOrder: 9,
  },
  {
    slug: "egitim-program",
    name: "Program Geliştirme",
    description: "Program tasarımı, hedef-davranış, içerik düzenleme, değerlendirme yaklaşımları.",
    color: "#f97316",
    icon: "clipboard-list",
    sortOrder: 10,
  },
  {
    slug: "egitim-olcme",
    name: "Ölçme ve Değerlendirme",
    description: "Geçerlik, güvenirlik, madde analizi, test türleri, ölçekler.",
    color: "#eab308",
    icon: "clipboard-check",
    sortOrder: 11,
  },
  {
    slug: "egitim-rehberlik",
    name: "Rehberlik ve Psikolojik Danışma",
    description: "Rehberlik ilkeleri, türleri, psikolojik danışma kuramları, teknikler.",
    color: "#10b981",
    icon: "compass",
    sortOrder: 12,
  },
  {
    slug: "egitim-ogretim",
    name: "Öğretim İlkeleri ve Yöntemleri",
    description: "Öğretim stratejileri, yöntem ve teknikler, materyal kullanımı.",
    color: "#6366f1",
    icon: "graduation-cap",
    sortOrder: 13,
  },
  {
    slug: "egitim-sinif",
    name: "Sınıf Yönetimi",
    description: "Disiplin modelleri, istenmeyen davranışlar, sınıf iklimi, iletişim.",
    color: "#f43f5e",
    icon: "users",
    sortOrder: 14,
  },
  {
    slug: "egitim-teknoloji",
    name: "Öğretim Teknolojileri",
    description: "Eğitimde teknoloji kullanımı, uzaktan eğitim, dijital materyaller.",
    color: "#0ea5e9",
    icon: "monitor",
    sortOrder: 15,
  },
  {
    slug: "egitim-ozel",
    name: "Özel Eğitim",
    description: "Özel gereksinimli bireyler, kaynaştırma, BEP, özel eğitim türleri.",
    color: "#84cc16",
    icon: "puzzle",
    sortOrder: 16,
  },
];

export const SEED_CATEGORY_SLUGS = SEED_CATEGORIES.map((category) => category.slug);

export function isSeedCategorySlug(value: string): boolean {
  return SEED_CATEGORY_SLUGS.includes(value);
}
