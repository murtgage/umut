/**
 * Soru dosyası doğrulayıcı.
 *
 * Kullanım:
 *   npx.cmd tsx scripts/validate-questions.ts <dosya.json> [<dosya2.json> ...]
 *
 * Kabul edilen biçim: `{ "questions": [ ... ] }` veya doğrudan `[ ... ]`.
 *
 * Kontroller:
 *  - categorySlug `prisma/seed-categories.ts` listesinde olmalı
 *  - difficulty 1|2|3, correctOption A|B|C|D
 *  - dört seçenek de dolu ve birbirinden farklı
 *  - soru metni ve açıklama yeterince uzun
 *  - dosya içinde ve dosyalar arasında kopya soru yok
 *  - mevcut `questions.json` ile çakışma var mı
 *
 * Hatalıysa çıkış kodu 1 olur; uyarılar yalnızca raporlanır.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { SEED_CATEGORY_SLUGS } from "../prisma/seed-categories";

const OPTION_KEYS = ["A", "B", "C", "D"] as const;
type OptionKey = (typeof OPTION_KEYS)[number];

interface Question {
  categorySlug: string;
  topic?: string;
  difficulty: number;
  text: string;
  options: Record<OptionKey, string>;
  correctOption: OptionKey;
  explanation?: string;
}

const ROOT = process.cwd();

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function readQuestions(file: string): Promise<Question[]> {
  const raw = await readFile(path.resolve(ROOT, file), "utf8");
  const parsed = JSON.parse(raw) as Question[] | { questions: Question[] };
  const list = Array.isArray(parsed) ? parsed : parsed.questions;
  if (!Array.isArray(list)) {
    throw new Error(`${file}: "questions" dizisi bulunamadı`);
  }
  return list;
}

async function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error("Kullanım: tsx scripts/validate-questions.ts <dosya.json> [...]");
    process.exitCode = 1;
    return;
  }

  // Mevcut (yayında olan) sorularla çakışma kontrolü.
  const existingTexts = new Set<string>();
  try {
    const existing = await readQuestions("prisma/seed-data/questions.json");
    for (const question of existing) existingTexts.add(normalize(question.text));
  } catch {
    // İlk kurulumda dosya olmayabilir; sorun değil.
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Map<string, string>();
  const perCategory = new Map<string, number>();
  const perDifficulty = new Map<number, number>();
  const perAnswer = new Map<string, number>();
  let total = 0;

  for (const file of files) {
    let questions: Question[];
    try {
      questions = await readQuestions(file);
    } catch (error) {
      errors.push(`${file}: okunamadı — ${error instanceof Error ? error.message : error}`);
      continue;
    }

    questions.forEach((question, index) => {
      total += 1;
      const where = `${file} #${index + 1}`;

      if (!SEED_CATEGORY_SLUGS.includes(question.categorySlug)) {
        errors.push(`${where}: geçersiz categorySlug "${question.categorySlug}"`);
      }

      if (![1, 2, 3].includes(question.difficulty)) {
        errors.push(`${where}: difficulty 1-3 olmalı (gelen ${question.difficulty})`);
      }

      if (typeof question.text !== "string" || question.text.trim().length < 15) {
        errors.push(`${where}: soru metni çok kısa`);
      }

      if (!OPTION_KEYS.includes(question.correctOption)) {
        errors.push(`${where}: correctOption A|B|C|D olmalı (gelen ${question.correctOption})`);
      }

      const values: string[] = [];
      for (const key of OPTION_KEYS) {
        const value = question.options?.[key];
        if (typeof value !== "string" || value.trim().length === 0) {
          errors.push(`${where}: "${key}" seçeneği boş`);
        } else {
          values.push(value.trim());
        }
      }
      if (new Set(values).size !== values.length) {
        errors.push(`${where}: seçenekler birbirinden farklı değil`);
      }

      if (
        typeof question.explanation !== "string" ||
        question.explanation.trim().length < 15
      ) {
        errors.push(`${where}: açıklama çok kısa veya eksik`);
      }

      if (typeof question.text === "string") {
        const key = normalize(question.text);
        const previous = seen.get(key);
        if (previous) {
          errors.push(`${where}: kopya soru — ${previous} ile aynı`);
        } else {
          seen.set(key, where);
        }
        if (existingTexts.has(key)) {
          errors.push(`${where}: mevcut soru bankasında zaten var`);
        }
      }

      perCategory.set(question.categorySlug, (perCategory.get(question.categorySlug) ?? 0) + 1);
      perDifficulty.set(question.difficulty, (perDifficulty.get(question.difficulty) ?? 0) + 1);
      perAnswer.set(question.correctOption, (perAnswer.get(question.correctOption) ?? 0) + 1);
    });

    warnings.push(`${file}: ${questions.length} soru`);
  }

  console.log(`\nToplam soru: ${total}`);
  console.log("Kategoriye göre:");
  for (const slug of SEED_CATEGORY_SLUGS) {
    const count = perCategory.get(slug) ?? 0;
    if (count > 0) console.log(`  ${slug}: ${count}`);
  }
  console.log(
    `Zorluk: kolay ${perDifficulty.get(1) ?? 0} / orta ${perDifficulty.get(2) ?? 0} / zor ${perDifficulty.get(3) ?? 0}`,
  );
  console.log(
    `Doğru cevap dağılımı: A ${perAnswer.get("A") ?? 0} / B ${perAnswer.get("B") ?? 0} / C ${perAnswer.get("C") ?? 0} / D ${perAnswer.get("D") ?? 0}`,
  );

  if (total > 0) {
    const mostCommon = Math.max(...[...perAnswer.values()], 0);
    if (mostCommon / total > 0.45) {
      warnings.push(
        `Doğru cevaplar tek harfte toplanıyor (en sık: ${mostCommon}/${total}) — dağıt.`,
      );
    }
    const easy = perDifficulty.get(1) ?? 0;
    const hard = perDifficulty.get(3) ?? 0;
    if (easy / total < 0.1 || hard / total < 0.1) {
      warnings.push("Zorluk dağılımı dengesiz (kolay veya zor soru çok az).");
    }
  }

  if (warnings.length > 0) {
    console.log("\nUyarılar:");
    for (const warning of warnings) console.log(`  - ${warning}`);
  }

  if (errors.length > 0) {
    console.log(`\nHATALAR (${errors.length}):`);
    for (const error of errors.slice(0, 40)) console.log(`  - ${error}`);
    if (errors.length > 40) console.log(`  ... ve ${errors.length - 40} hata daha`);
    process.exitCode = 1;
    return;
  }

  console.log("\n✓ Doğrulama başarılı.\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
