import Link from "next/link";

import { GuestButton } from "@/components/auth/guest-button";
import { CategoryIcon } from "@/components/category-icon";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EXAM_TYPES } from "@/lib/exam-types";
import { formatNumber, formatPercent } from "@/lib/format";
import { getGlobalLeaderboard } from "@/lib/leaderboard";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const HIGHLIGHTS = [
  { icon: "⚡", label: "30 sn soru, hız bonusu" },
  { icon: "🔥", label: "Seri bonusu" },
  { icon: "📚", label: "Ders ders çalışma" },
  { icon: "🏆", label: "Genel sıralama" },
];

export default async function HomePage() {
  const [session, categories, topPlayers] = await Promise.all([
    getSession(),
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
    getGlobalLeaderboard({ limit: 5 }),
  ]);

  const totalQuestions = categories.reduce(
    (total, category) => total + category._count.questions,
    0,
  );
  const primaryHref = session ? "/oyna" : "/kayit";
  const primaryLabel = session ? "Oyuna devam et" : "Ücretsiz başla";

  const categoryBySlug = new Map(
    categories.map((category) => [category.slug, category]),
  );
  const groups = EXAM_TYPES.filter((exam) => exam.slug !== "karisik").map(
    (exam) => ({
      ...exam,
      lessons: exam.categorySlugs
        .map((slug) => categoryBySlug.get(slug))
        .filter((lesson): lesson is (typeof categories)[number] =>
          Boolean(lesson),
        ),
    }),
  );

  return (
    <div className="flex flex-col">
      {/* Kahraman bölümü */}
      <section className="px-4 pt-14 pb-12 sm:px-6 sm:pt-20">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Badge tone="brand" className="mb-5">
            {formatNumber(totalQuestions)} özgün soru · {categories.length} ders
          </Badge>

          <h1 className="text-4xl font-extrabold tracking-tight text-balance text-ink sm:text-5xl">
            Umut etme, bil.
          </h1>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
            KPSS&apos;ye hazırlanmayı oyuna çevir. Sınav türünü ve dersini seç,
            süreli sorularla puan topla, eksiklerini gör.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <Link href={primaryHref} className={buttonVariants({ size: "lg" })}>
              {primaryLabel}
            </Link>
            {session ? null : (
              <GuestButton label="Üye olmadan dene" size="lg" />
            )}
          </div>

          <p className="mt-3 text-xs text-ink-faint">
            Kredi kartı yok · Ücretsiz · Üye olmadan 5 tur deneme
          </p>
        </div>
      </section>

      {/* Kısa özellik şeridi — kart yığını yok */}
      <section className="px-4 pb-14 sm:px-6">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {HIGHLIGHTS.map((item) => (
            <span
              key={item.label}
              className="flex items-center gap-2 text-sm text-ink-muted"
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </span>
          ))}
        </div>
      </section>

      {/* Dersler — sınav bölümüne göre gruplu, kompakt */}
      <section className="px-4 pb-14 sm:px-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-ink">
                Ne çalışmak istersin?
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                Sınav bölümünü seç, istersen tek derse odaklan.
              </p>
            </div>
            <Link
              href={primaryHref}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Oyuna git →
            </Link>
          </div>

          <div className="flex flex-col gap-6">
            {groups.map((group) => (
              <div key={group.slug} className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span aria-hidden>{group.icon}</span>
                  <h3 className="text-sm font-semibold text-ink">
                    {group.name}
                  </h3>
                  <span className="tnum text-xs text-ink-faint">
                    {formatNumber(
                      group.lessons.reduce(
                        (total, lesson) => total + lesson._count.questions,
                        0,
                      ),
                    )}{" "}
                    soru
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {group.lessons.map((lesson) => (
                    <Link
                      key={lesson.id}
                      href={primaryHref}
                      className="flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm transition hover:border-brand/40 hover:bg-elevated/60"
                    >
                      <span
                        className="grid size-4 shrink-0 place-items-center"
                        aria-hidden
                      >
                        <CategoryIcon
                          name={lesson.icon}
                          color={lesson.color}
                          size={14}
                        />
                      </span>
                      <span className="font-medium text-ink">
                        {lesson.name}
                      </span>
                      <span className="tnum text-xs text-ink-faint">
                        {lesson._count.questions}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sıralama + nasıl oynanır */}
      <section className="px-4 pb-14 sm:px-6">
        <div className="mx-auto grid max-w-4xl gap-5 lg:grid-cols-2">
          <div className="surface-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">Zirvedekiler</h2>
              <Link
                href="/siralama"
                className="text-xs text-brand-soft transition hover:text-accent"
              >
                Tümü →
              </Link>
            </div>

            {topPlayers.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-muted">
                Sıralama henüz boş. İlk sıraya sen geç!
              </p>
            ) : (
              <ol className="flex flex-col divide-y divide-line">
                {topPlayers.map((player) => (
                  <li key={player.userId} className="flex items-center gap-3 py-2.5">
                    <span
                      className={cn(
                        "tnum grid size-6 place-items-center rounded-lg border text-xs font-bold",
                        player.rank === 1 && "border-gold/40 bg-gold/10 text-gold",
                        player.rank === 2 &&
                          "border-line-strong bg-elevated text-ink-muted",
                        player.rank === 3 &&
                          "border-warning/30 bg-warning/10 text-warning",
                        player.rank > 3 &&
                          "border-line bg-elevated text-ink-faint",
                      )}
                    >
                      {player.rank}
                    </span>
                    <Avatar name={player.name} image={player.image} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {player.name}
                      </p>
                      <p className="tnum text-xs text-ink-faint">
                        Sv. {player.level} · İsabet {formatPercent(player.accuracy)}
                      </p>
                    </div>
                    <span className="tnum text-sm font-bold text-brand-soft">
                      {formatNumber(player.totalScore)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="surface-card flex flex-col gap-4 p-5">
            <h2 className="text-base font-semibold text-ink">
              Nasıl oynanır?
            </h2>

            <ol className="flex flex-col gap-3">
              {[
                "Sınav türünü ve dersini seç.",
                "10 soruyu süre dolmadan cevapla.",
                "Hız ve seri bonuslarıyla puanını katla.",
                "Tur sonunda yanlışlarını ve açıklamalarını gör.",
              ].map((step, index) => (
                <li key={step} className="flex items-center gap-3">
                  <span className="tnum grid size-6 shrink-0 place-items-center rounded-lg border border-brand/30 bg-brand/5 text-xs font-bold text-brand-soft">
                    {index + 1}
                  </span>
                  <span className="text-sm text-ink-muted">{step}</span>
                </li>
              ))}
            </ol>

            <Link
              href={primaryHref}
              className={buttonVariants({ className: "mt-auto w-full" })}
            >
              {primaryLabel}
            </Link>
          </div>
        </div>
      </section>

      {/* Yasal not */}
      <section className="px-4 pb-16 sm:px-6">
        <p className="mx-auto max-w-3xl rounded-xl border border-line bg-surface px-5 py-4 text-center text-xs leading-relaxed text-ink-faint">
          Umut, bağımsız bir çalışma platformudur. Sorular KPSS müfredatına uygun
          şekilde özgün olarak hazırlanmıştır ve ÖSYM tarafından yayımlanmış çıkmış
          soruları içermez. ÖSYM, KPSS ve ilgili kurumlarla herhangi bir bağlantısı
          yoktur.
        </p>
      </section>
    </div>
  );
}
