import Link from "next/link";

import { GuestButton } from "@/components/auth/guest-button";
import { CategoryIcon } from "@/components/category-icon";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber, formatPercent } from "@/lib/format";
import { getGlobalLeaderboard } from "@/lib/leaderboard";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: "⚡",
    title: "Süreli sorular, hızlı puan",
    description:
      "Her soru için 30 saniye. Ne kadar hızlı ve doğru cevaplarsan o kadar çok puan kazanırsın.",
  },
  {
    icon: "🔥",
    title: "Seri bonusu",
    description:
      "Üst üste doğru cevapladıkça seri bonusu büyür. Tek bir hata seriyi sıfırlar.",
  },
  {
    icon: "📚",
    title: "Ders ders çalış",
    description:
      "Türkçe, Matematik, Tarih, Vatandaşlık, Eğitim Bilimleri ve daha fazlası — istediğin derse odaklan.",
  },
  {
    icon: "🏆",
    title: "Genel sıralama",
    description:
      "Türkiye geneli sıralamada yerini gör, kendini diğer adaylarla kıyasla.",
  },
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
        description: true,
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

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-16 pb-20 sm:px-6 sm:pt-24">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <Badge tone="brand" className="mb-6">
            {formatNumber(totalQuestions)} özgün soru · {categories.length} ders
          </Badge>

          <h1 className="text-4xl font-extrabold tracking-tight text-balance text-ink sm:text-6xl">
            Umut etme,{" "}
            <span className="bg-gradient-to-r from-brand-soft via-accent to-brand-soft bg-clip-text text-transparent">
              bil.
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-muted">
            KPSS&apos;ye hazırlanmayı bir oyuna çevir. Süreli sorularla puan topla,
            serini koru, ders bazlı eksiklerini gör ve Türkiye geneli sıralamada
            yüksel.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <Link href={primaryHref} className={buttonVariants({ size: "lg" })}>
              {primaryLabel}
            </Link>
            {session ? null : (
              <GuestButton label="Üye olmadan dene" size="lg" />
            )}
            <Link
              href="/siralama"
              className={buttonVariants({ variant: "secondary", size: "lg" })}
            >
              Sıralamayı gör
            </Link>
          </div>

          <p className="mt-4 text-xs text-ink-faint">
            Kredi kartı yok · Saniyeler içinde başla · Tamamen ücretsiz
          </p>
        </div>
      </section>

      {/* Özellikler */}
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <Card key={feature.title}>
              <CardContent className="flex flex-col gap-2 pt-6">
                <span className="text-2xl" aria-hidden>
                  {feature.icon}
                </span>
                <h2 className="text-base font-semibold text-ink">
                  {feature.title}
                </h2>
                <p className="text-sm leading-relaxed text-ink-muted">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Dersler */}
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-ink">
                Çalışmak istediğin dersi seç
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                Her ders için özenle hazırlanmış, KPSS formatında özgün sorular.
              </p>
            </div>
            <Link
              href={primaryHref}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Tümünü gör →
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={primaryHref}
                className="surface-card group flex flex-col gap-2 p-4 transition hover:-translate-y-0.5 hover:border-brand-soft/50"
              >
                <span
                  className="grid size-10 place-items-center rounded-xl"
                  style={{ backgroundColor: `${category.color}22` }}
                  aria-hidden
                >
                  <CategoryIcon
                    name={category.icon}
                    color={category.color}
                    size={20}
                  />
                </span>
                <span className="font-semibold text-ink">{category.name}</span>
                <span className="text-xs leading-relaxed text-ink-muted">
                  {category.description ?? "KPSS formatında özgün sorular"}
                </span>
                <span className="tnum mt-auto pt-2 text-xs text-ink-faint">
                  {category._count.questions} soru
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Sıralama önizlemesi + nasıl çalışır */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="flex flex-col gap-4 pt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-ink">
                  Zirvedekiler
                </h2>
                <Link
                  href="/siralama"
                  className="text-xs text-brand-soft transition hover:text-accent"
                >
                  Tümü →
                </Link>
              </div>

              {topPlayers.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-muted">
                  Sıralama henüz boş. İlk sıraya sen geç!
                </p>
              ) : (
                <ol className="flex flex-col divide-y divide-line">
                  {topPlayers.map((player) => (
                    <li
                      key={player.userId}
                      className="flex items-center gap-3 py-3"
                    >
                      <span
                        className={cn(
                          "tnum grid size-7 place-items-center rounded-lg border text-xs font-bold",
                          player.rank === 1 &&
                            "border-gold/50 bg-gold/15 text-gold",
                          player.rank === 2 &&
                            "border-ink-muted/40 bg-ink-muted/10 text-ink",
                          player.rank === 3 &&
                            "border-warning/40 bg-warning/10 text-warning",
                          player.rank > 3 &&
                            "border-line bg-canvas/50 text-ink-muted",
                        )}
                      >
                        {player.rank}
                      </span>
                      <Avatar name={player.name} image={player.image} size="sm" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-ink">
                          {player.name}
                        </p>
                        <p className="tnum text-xs text-ink-faint">
                          Sv. {player.level} · İsabet{" "}
                          {formatPercent(player.accuracy)}
                        </p>
                      </div>
                      <span className="tnum text-sm font-bold text-brand-soft">
                        {formatNumber(player.totalScore)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-5 pt-6">
              <h2 className="text-lg font-semibold text-ink">Nasıl oynanır?</h2>

              <ol className="flex flex-col gap-4">
                {[
                  {
                    title: "Hesabını oluştur",
                    text: "Kullanıcı adı ve e-posta ile saniyeler içinde kayıt ol.",
                  },
                  {
                    title: "Modunu seç",
                    text: "Karma hızlı tur, tek ders turu veya günün meydan okuması.",
                  },
                  {
                    title: "Cevapla ve puan topla",
                    text: "Hız ve seri bonuslarıyla puanını katla.",
                  },
                  {
                    title: "Eksiklerini gör",
                    text: "Tur sonunda yanlışlarını ve açıklamalarını tekrar et.",
                  },
                ].map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="tnum grid size-8 shrink-0 place-items-center rounded-xl border border-brand/40 bg-brand/10 text-sm font-bold text-brand-soft">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-ink">{step.title}</p>
                      <p className="text-sm text-ink-muted">{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <Link
                href={primaryHref}
                className={buttonVariants({ size: "lg", className: "mt-1" })}
              >
                {primaryLabel}
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Yasal not */}
      <section className="px-4 pb-20 sm:px-6">
        <p className="mx-auto max-w-3xl rounded-xl border border-line bg-elevated/40 px-5 py-4 text-center text-xs leading-relaxed text-ink-faint">
          Umut, bağımsız bir çalışma platformudur. Sorular KPSS müfredatına uygun
          şekilde özgün olarak hazırlanmıştır ve ÖSYM tarafından yayımlanmış çıkmış
          soruları içermez. ÖSYM, KPSS ve ilgili kurumlarla herhangi bir bağlantısı
          yoktur.
        </p>
      </section>
    </div>
  );
}
