import "dotenv/config";

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "../src/lib/prisma";

/**
 * Soru bankası tohumlama betiği.
 *
 * Kaynak: `prisma/seed-data/questions.json`
 * Çalıştırma: `npx prisma db seed`  (veya doğrudan `npx tsx prisma/seed.ts`)
 *
 * Betik tekrar çalıştırılabilir (idempotent): kategoriler `slug` ile,
 * sorular ise kategori + soru metninden türetilen deterministik id ile
 * upsert edilir; bu yüzden ikinci çalıştırma kopya üretmez.
 */

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

type OptionKey = (typeof OPTION_KEYS)[number];

interface SeedCategory {
  slug: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  sortOrder?: number;
}

interface SeedQuestion {
  categorySlug: string;
  topic?: string;
  difficulty: number;
  text: string;
  options: Record<OptionKey, string>;
  correctOption: OptionKey;
  explanation?: string;
  source?: string;
}

interface SeedFile {
  categories: SeedCategory[];
  questions: SeedQuestion[];
}

const DEFAULT_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

function assertValid(data: SeedFile) {
  const problems: string[] = [];

  if (!Array.isArray(data.categories) || data.categories.length === 0) {
    throw new Error("seed-data: `categories` boş veya dizi değil");
  }
  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    throw new Error("seed-data: `questions` boş veya dizi değil");
  }

  const slugs = new Set(data.categories.map((category) => category.slug));

  data.questions.forEach((question, index) => {
    const where = `soru #${index + 1}`;

    if (!slugs.has(question.categorySlug)) {
      problems.push(`${where}: bilinmeyen categorySlug "${question.categorySlug}"`);
    }
    if (!question.text || question.text.trim().length < 5) {
      problems.push(`${where}: "text" çok kısa`);
    }
    if (![1, 2, 3].includes(question.difficulty)) {
      problems.push(`${where}: "difficulty" 1-3 arasında olmalı (gelen: ${question.difficulty})`);
    }
    if (!OPTION_KEYS.includes(question.correctOption)) {
      problems.push(`${where}: "correctOption" A|B|C|D olmalı (gelen: ${question.correctOption})`);
    }

    for (const key of OPTION_KEYS) {
      const value = question.options?.[key];
      if (typeof value !== "string" || value.trim().length === 0) {
        problems.push(`${where}: "${key}" seçeneği eksik`);
      }
    }

    // Aynı seçeneğin iki kez yazılması neredeyse her zaman bir yazım hatasıdır.
    const values = OPTION_KEYS.map((key) => question.options?.[key]?.trim()).filter(Boolean);
    if (new Set(values).size !== values.length) {
      problems.push(`${where}: seçenekler birbirinden farklı değil`);
    }
  });

  if (problems.length > 0) {
    const preview = problems.slice(0, 25).join("\n  - ");
    const rest = problems.length > 25 ? `\n  ... ve ${problems.length - 25} sorun daha` : "";
    throw new Error(`seed-data doğrulaması başarısız:\n  - ${preview}${rest}`);
  }
}

/** Kategori + soru metninden deterministik bir id üretir (upsert için). */
function questionId(categorySlug: string, text: string): string {
  const digest = createHash("sha1").update(`${categorySlug}|${text.trim()}`).digest("hex");
  return `q_${digest.slice(0, 24)}`;
}

async function main() {
  const dataPath = path.join(process.cwd(), "prisma", "seed-data", "questions.json");
  const raw = await readFile(dataPath, "utf8");
  const data = JSON.parse(raw) as SeedFile;

  assertValid(data);

  // --- Kategoriler ---
  const categoryIdBySlug = new Map<string, string>();

  for (const [index, category] of data.categories.entries()) {
    const values = {
      name: category.name,
      description: category.description ?? null,
      color: category.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length],
      icon: category.icon ?? null,
      sortOrder: category.sortOrder ?? index + 1,
      isActive: true,
    };

    const row = await prisma.category.upsert({
      where: { slug: category.slug },
      create: { slug: category.slug, ...values },
      update: values,
    });

    categoryIdBySlug.set(category.slug, row.id);
  }

  // --- Sorular ---
  let created = 0;
  let updated = 0;

  for (const question of data.questions) {
    const categoryId = categoryIdBySlug.get(question.categorySlug);
    if (!categoryId) {
      throw new Error(`Kategori bulunamadı: ${question.categorySlug}`);
    }

    const id = questionId(question.categorySlug, question.text);

    const values = {
      categoryId,
      text: question.text.trim(),
      optionA: question.options.A.trim(),
      optionB: question.options.B.trim(),
      optionC: question.options.C.trim(),
      optionD: question.options.D.trim(),
      correctOption: question.correctOption,
      explanation: question.explanation?.trim() ?? null,
      difficulty: question.difficulty,
      topic: question.topic?.trim() ?? null,
      source: question.source?.trim() ?? null,
      isActive: true,
    };

    const existing = await prisma.question.findUnique({ where: { id }, select: { id: true } });

    await prisma.question.upsert({
      where: { id },
      create: { id, ...values },
      update: values,
    });

    if (existing) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  // --- Budama: JSON tek doğruluk kaynağıdır ---
  // Dosyada bulunmayan sorular ve kategoriler SİLİNMEZ, pasife alınır; böylece
  // geçmiş turların GameAnswer kayıtları (FK) bozulmaz.
  const seededQuestionIds = data.questions.map((question) =>
    questionId(question.categorySlug, question.text),
  );
  const seededSlugs = data.categories.map((category) => category.slug);

  // SQLite parametre limiti (999) nedeniyle toplu updateMany yerine parçalı çalıştır.
  // Daha güvenli: tüm aktif soruları çek, seeded set'e göre pasife al.
  const allActive = await prisma.question.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  const seededSet = new Set(seededQuestionIds);
  const toRetire = allActive.map((q) => q.id).filter((id) => !seededSet.has(id));

  const chunkSize = 500;
  let retiredCount = 0;
  for (let i = 0; i < toRetire.length; i += chunkSize) {
    const chunk = toRetire.slice(i, i + chunkSize);
    const r = await prisma.question.updateMany({
      where: { id: { in: chunk } },
      data: { isActive: false },
    });
    retiredCount += r.count;
  }

  const retiredQuestions = { count: retiredCount };

  const retiredCategories = await prisma.category.updateMany({
    where: { isActive: true, slug: { notIn: seededSlugs } },
    data: { isActive: false },
  });

  const perCategory = await prisma.category.findMany({
    select: {
      name: true,
      isActive: true,
      _count: { select: { questions: { where: { isActive: true } } } },
    },
    orderBy: { sortOrder: "asc" },
  });

  console.log("\nUmut — soru bankası hazır");
  console.log(`  Kategori : ${data.categories.length}`);
  console.log(`  Soru     : ${created} yeni, ${updated} güncellendi (toplam ${data.questions.length})`);
  if (retiredQuestions.count > 0) {
    console.log(`  Pasife alınan soru      : ${retiredQuestions.count}`);
  }
  if (retiredCategories.count > 0) {
    console.log(`  Pasife alınan kategori  : ${retiredCategories.count}`);
  }
  console.log("  Dağılım  :");
  for (const category of perCategory) {
    const state = category.isActive ? "" : " (pasif)";
    console.log(`    - ${category.name}: ${category._count.questions}${state}`);
  }
  console.log("");
}

main()
  .catch((error) => {
    console.error("\nSeed başarısız:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
