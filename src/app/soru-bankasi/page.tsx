import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/format";
import { DIFFICULTY_CHOICES } from "@/lib/game-types";
import { prisma } from "@/lib/prisma";
import { DIFFICULTY_LABEL } from "@/lib/scoring";
import { requireVerifiedUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Soru Bankası",
  description:
    "KPSS soru bankasını kategori, zorluk ve konuya göre incele; doğru cevap ve açıklamalarla çalış.",
};

/** Sayfa başına gösterilecek soru sayısı. */
const PAGE_SIZE = 15;

interface BankPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

interface BankFilters {
  kategori: string | null;
  zorluk: string | null;
  q: string;
  sayfa: number;
}

function bankUrl(filters: {
  kategori?: string | null;
  zorluk?: string | null;
  q?: string | null;
  sayfa?: number;
}): string {
  const params = new URLSearchParams();
  if (filters.kategori) params.set("kategori", filters.kategori);
  if (filters.zorluk) params.set("zorluk", filters.zorluk);
  if (filters.q) params.set("q", filters.q);
  if (filters.sayfa && filters.sayfa > 1) {
    params.set("sayfa", String(filters.sayfa));
  }
  const query = params.toString();
  return query ? `/soru-bankasi?${query}` : "/soru-bankasi";
}

const DIFFICULTY_TONE: Record<number, "success" | "warning" | "danger"> = {
  1: "success",
  2: "warning",
  3: "danger",
};

export default async function BankPage(props: BankPageProps) {
  await requireVerifiedUser("/soru-bankasi");
  const searchParams = await props.searchParams;

  const kategori = firstValue(searchParams.kategori) || null;
  const zorlukParam = firstValue(searchParams.zorluk);
  const zorluk =
    zorlukParam && ["1", "2", "3"].includes(zorlukParam) ? zorlukParam : null;
  const q = firstValue(searchParams.q).trim();
  const sayfa = Math.max(1, Number(firstValue(searchParams.sayfa)) || 1);

  const where = {
    isActive: true,
    ...(kategori ? { category: { slug: kategori } } : {}),
    ...(zorluk ? { difficulty: Number(zorluk) } : {}),
    ...(q ? { text: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [categories, total, questions] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        color: true,
        icon: true,
        _count: { select: { questions: { where: { isActive: true } } } },
      },
    }),
    prisma.question.count({ where }),
    prisma.question.findMany({
      where,
      orderBy: [{ category: { sortOrder: "asc" } }, { id: "asc" }],
      skip: (sayfa - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        text: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
        correctOption: true,
        explanation: true,
        difficulty: true,
        topic: true,
        category: { select: { name: true, slug: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filters: BankFilters = { kategori, zorluk, q, sayfa };
  const bankTotal = categories.reduce(
    (sum, category) => sum + category._count.questions,
    0,
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <section className="surface-card flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              Soru Bankası
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              Toplam{" "}
              <span className="tnum font-semibold text-ink">
                {formatNumber(bankTotal)}
              </span>{" "}
              soru · doğru cevap ve açıklamalarla incele.
            </p>
          </div>
          <Link href="/oyna" className={buttonVariants({ size: "sm" })}>
            Oyna
          </Link>
        </div>

        {/* Arama — GET formu, JavaScript olmadan da çalışır. */}
        <form
          method="get"
          action="/soru-bankasi"
          className="flex flex-col gap-2 sm:flex-row"
        >
          {kategori ? (
            <input type="hidden" name="kategori" value={kategori} />
          ) : null}
          {zorluk ? <input type="hidden" name="zorluk" value={zorluk} /> : null}
          <Input
            name="q"
            defaultValue={q}
            placeholder="Soru ya da konu ara…"
            aria-label="Soru ara"
          />
          <Button type="submit" variant="secondary" className="sm:w-28">
            Ara
          </Button>
        </form>
      </section>

      {/* Kategori filtresi */}
      <nav
        aria-label="Kategori filtresi"
        className="flex flex-wrap items-center gap-2"
      >
        <FilterChip
          href={bankUrl({ zorluk, q })}
          active={!kategori}
          label="Tümü"
        />
        {categories.map((category) => (
          <FilterChip
            key={category.id}
            href={bankUrl({ kategori: category.slug, zorluk, q })}
            active={kategori === category.slug}
            label={`${category.icon ? `${category.icon} ` : ""}${category.name}`}
            count={category._count.questions}
          />
        ))}
      </nav>

      {/* Zorluk filtresi */}
      <nav
        aria-label="Zorluk filtresi"
        className="flex flex-wrap items-center gap-2"
      >
        <FilterChip href={bankUrl({ kategori, q })} active={!zorluk} label="Tümü" />
        {DIFFICULTY_CHOICES.filter((choice) => choice.value > 0).map(
          (choice) => (
            <FilterChip
              key={choice.value}
              href={bankUrl({
                kategori,
                zorluk: String(choice.value),
                q,
              })}
              active={zorluk === String(choice.value)}
              label={choice.label}
            />
          ),
        )}
      </nav>

      <p className="text-sm text-ink-muted">
        <span className="tnum font-semibold text-ink">{formatNumber(total)}</span>{" "}
        soru listeleniyor
        {totalPages > 1 ? (
          <span className="tnum text-ink-faint"> · sayfa {sayfa}/{totalPages}</span>
        ) : null}
      </p>

      {questions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-6">
            <p className="text-sm font-medium text-ink">Sonuç bulunamadı.</p>
            <p className="text-sm text-ink-muted">
              Filtreleri gevşetmeyi veya farklı bir kelime aramayı dene.
            </p>
            <Link
              href="/soru-bankasi"
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              Filtreleri temizle
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-4">
          {questions.map((question) => {
            const options = [
              { key: "A", text: question.optionA },
              { key: "B", text: question.optionB },
              { key: "C", text: question.optionC },
              { key: "D", text: question.optionD },
            ];

            return (
              <li key={question.id}>
                <Card>
                  <CardContent className="flex flex-col gap-3 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="brand">{question.category.name}</Badge>
                      {question.topic ? (
                        <Badge tone="neutral">{question.topic}</Badge>
                      ) : null}
                      <Badge tone={DIFFICULTY_TONE[question.difficulty] ?? "neutral"}>
                        {DIFFICULTY_LABEL[question.difficulty] ?? "Orta"}
                      </Badge>
                    </div>

                    <p className="text-sm leading-relaxed font-medium text-ink">
                      {question.text}
                    </p>

                    <ul className="flex flex-col gap-1.5">
                      {options.map((option) => {
                        const isCorrect =
                          option.key === question.correctOption.toUpperCase();
                        return (
                          <li
                            key={option.key}
                            className={cn(
                              "rounded-lg border px-3 py-2 text-sm leading-relaxed",
                              isCorrect
                                ? "border-success/40 bg-success/10 text-ink"
                                : "border-line bg-elevated/40 text-ink-muted",
                            )}
                          >
                            <span className="font-semibold">{option.key})</span>{" "}
                            {option.text}
                            {isCorrect ? (
                              <span className="ml-2 text-xs font-medium text-success">
                                Doğru cevap
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>

                    {question.explanation ? (
                      <p className="rounded-lg border border-line bg-canvas/60 px-3 py-2 text-xs leading-relaxed text-ink-muted">
                        <span className="font-semibold text-ink">Açıklama: </span>
                        {question.explanation}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 ? (
        <nav
          aria-label="Sayfalama"
          className="flex items-center justify-between gap-3"
        >
          {sayfa > 1 ? (
            <Link
              href={bankUrl({ ...filters, sayfa: sayfa - 1 })}
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              ← Önceki
            </Link>
          ) : (
            <span />
          )}
          <span className="tnum text-xs text-ink-muted">
            {sayfa} / {totalPages}
          </span>
          {sayfa < totalPages ? (
            <Link
              href={bankUrl({ ...filters, sayfa: sayfa + 1 })}
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              Sonraki →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}

function FilterChip({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count?: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition",
        active
          ? "border-brand/50 bg-brand/10 text-brand-soft"
          : "border-line bg-canvas/40 text-ink-muted hover:bg-elevated/60 hover:text-ink",
      )}
    >
      {label}
      {typeof count === "number" ? (
        <span className="tnum text-xs opacity-70">{formatNumber(count)}</span>
      ) : null}
    </Link>
  );
}
