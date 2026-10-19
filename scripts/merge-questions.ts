/**
 * Soru parçalarını tek bir `questions.json` dosyasında birleştirir.
 *
 * Kullanım:
 *   npx.cmd tsx scripts/merge-questions.ts
 *
 * Girdiler:
 *   prisma/seed-data/parts/*.json   (her biri `{ "questions": [...] }`)
 *   prisma/seed-data/questions.json (mevcut dosya; içeriği korunur)
 *
 * Çıktı:
 *   prisma/seed-data/questions.json  → { categories: SEED_CATEGORIES, questions: [...] }
 *
 * Kurallar:
 *  - Kategoriler `prisma/seed-categories.ts` içindeki canonical listeden gelir.
 *  - Kategorisi listede olmayan eski sorular (ör. kaldırılan `egitim-bilimleri`)
 *    çıktıya DAHİL EDİLMEZ; `prisma/seed.ts` bunları pasife alacaktır.
 *  - Aynı (kategori + normalleştirilmiş metin) ikilisi bir kez yazılır; ilk gelen kazanır.
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { SEED_CATEGORIES, SEED_CATEGORY_SLUGS } from "../prisma/seed-categories";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "prisma", "seed-data");
const PARTS_DIR = path.join(DATA_DIR, "parts");
const TARGET = path.join(DATA_DIR, "questions.json");

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

interface RawQuestion {
  categorySlug: string;
  topic?: string;
  difficulty: number;
  text: string;
  options: Record<string, string>;
  correctOption: string;
  explanation?: string;
  source?: string;
}

interface OutputQuestion {
  categorySlug: string;
  topic: string;
  difficulty: number;
  text: string;
  options: Record<string, string>;
  correctOption: string;
  explanation: string;
  source: string;
}

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toOutput(question: RawQuestion): OutputQuestion {
  return {
    categorySlug: question.categorySlug,
    topic: (question.topic ?? "").trim() || "Genel",
    difficulty: question.difficulty,
    text: question.text.trim().replace(/\s+/g, " "),
    options: {
      A: question.options?.A?.trim() ?? "",
      B: question.options?.B?.trim() ?? "",
      C: question.options?.C?.trim() ?? "",
      D: question.options?.D?.trim() ?? "",
    },
    correctOption: question.correctOption,
    explanation: (question.explanation ?? "").trim().replace(/\s+/g, " "),
    source: (question.source ?? "özgün").trim(),
  };
}

function isValid(question: RawQuestion): boolean {
  if (!SEED_CATEGORY_SLUGS.includes(question.categorySlug)) return false;
  if (![1, 2, 3].includes(question.difficulty)) return false;
  if (typeof question.text !== "string" || question.text.trim().length < 15) return false;
  if (!OPTION_KEYS.includes(question.correctOption as (typeof OPTION_KEYS)[number])) return false;
  if (typeof question.explanation !== "string" || question.explanation.trim().length < 15) {
    return false;
  }

  const values = OPTION_KEYS.map((key) => question.options?.[key]?.trim() ?? "");
  if (values.some((value) => value.length === 0)) return false;
  if (new Set(values).size !== values.length) return false;

  return true;
}

async function readQuestionsFrom(file: string): Promise<RawQuestion[]> {
  const raw = await readFile(file, "utf8");
  const parsed = JSON.parse(raw) as RawQuestion[] | { questions: RawQuestion[] };
  const list = Array.isArray(parsed) ? parsed : parsed.questions;
  if (!Array.isArray(list)) throw new Error(`${file}: "questions" dizisi yok`);
  return list;
}

async function main() {
  const sources: { label: string; questions: RawQuestion[] }[] = [];

  // 1) Mevcut dosya
  try {
    sources.push({
      label: "questions.json (mevcut)",
      questions: await readQuestionsFrom(TARGET),
    });
  } catch {
    console.log("Mevcut questions.json yok, sıfırdan oluşturulacak.");
  }

  // 2) Parçalar
  let partFiles: string[] = [];
  try {
    partFiles = (await readdir(PARTS_DIR))
      .filter((file) => file.endsWith(".json") && !file.startsWith("_"))
      .sort();
  } catch {
    console.log("parts/ dizini yok.");
  }

  for (const file of partFiles) {
    const full = path.join(PARTS_DIR, file);
    try {
      const questions = await readQuestionsFrom(full);
      sources.push({ label: `parts/${file}`, questions });
      console.log(`  okundu: parts/${file} → ${questions.length} soru`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Ajan geçici çıktıları (validation/verification) "questions" anahtarı
      // içermez — bunlar veri değil, atlanmaları gerekir.
      if (message.includes('"questions" dizisi yok')) {
        console.warn(`  ATLANDI: parts/${file} soru dosyası değil (ajan çıktısı)`);
        continue;
      }
      console.error(`  HATA: parts/${file} okunamadı — ${message}`);
      process.exitCode = 1;
      return;
    }
  }

  const seen = new Set<string>();
  const questions: OutputQuestion[] = [];
  const perCategory = new Map<string, number>();
  const duplicates: string[] = [];
  const dropped: string[] = [];

  for (const source of sources) {
    for (const question of source.questions) {
      if (!isValid(question)) {
        dropped.push(`${source.label}: geçersiz/atlanan soru → ${question.text?.slice(0, 50)}`);
        continue;
      }

      const key = `${question.categorySlug}::${normalize(question.text)}`;
      if (seen.has(key)) {
        duplicates.push(`${source.label}: ${question.text.slice(0, 50)}…`);
        continue;
      }

      seen.add(key);
      questions.push(toOutput(question));
      perCategory.set(question.categorySlug, (perCategory.get(question.categorySlug) ?? 0) + 1);
    }
  }

  // Deterministik çıktı: kategori sırasına, sonra metne göre sırala.
  const order = new Map(SEED_CATEGORY_SLUGS.map((slug, index) => [slug, index]));
  questions.sort((a, b) => {
    const byCategory = (order.get(a.categorySlug) ?? 99) - (order.get(b.categorySlug) ?? 99);
    if (byCategory !== 0) return byCategory;
    return a.text.localeCompare(b.text, "tr");
  });

  await writeFile(
    TARGET,
    `${JSON.stringify({ categories: SEED_CATEGORIES, questions }, null, 2)}\n`,
    "utf8",
  );

  console.log(`\nBirleştirme tamamlandı → ${path.relative(ROOT, TARGET)}`);
  console.log(`  Toplam soru : ${questions.length}`);
  console.log(`  Kategori    : ${perCategory.size}/${SEED_CATEGORY_SLUGS.length}`);
  console.log("  Dağılım:");
  for (const category of SEED_CATEGORIES) {
    const count = perCategory.get(category.slug) ?? 0;
    const flag = count === 0 ? "  ← BOŞ!" : "";
    console.log(`    ${category.slug.padEnd(20)} ${String(count).padStart(4)}${flag}`);
  }

  if (duplicates.length > 0) {
    console.log(`\n  Kopya olarak atlanan: ${duplicates.length}`);
    for (const line of duplicates.slice(0, 10)) console.log(`    - ${line}`);
  }
  if (dropped.length > 0) {
    console.log(`\n  Geçersiz olduğu için atlanan: ${dropped.length}`);
    for (const line of dropped.slice(0, 10)) console.log(`    - ${line}`);
  }

  console.log("");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
