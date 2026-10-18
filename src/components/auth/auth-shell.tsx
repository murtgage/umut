import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const BENEFITS = [
  {
    title: "Gerçek puanlama",
    body: "Doğru cevap, hız ve ardışık doğru serisi ayrı ayrı puanlanır.",
  },
  {
    title: "Seviye ve XP",
    body: "Her tur XP kazandırır; seviye atladıkça profilin gelişir.",
  },
  {
    title: "Genel sıralama",
    body: "Türkiye geneli sıralamada yerini gör, hedefini yükselt.",
  },
];

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-20">
      <section className="order-2 flex flex-col gap-6 lg:order-1">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-brand-soft uppercase">
            Umut · KPSS Arena
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Umut etme, <span className="text-brand-soft">bil.</span>
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
            KPSS&apos;ye hazırlanırken her turda ne kadar ilerlediğini ölç.
            Sorular KPSS formatı örnek alınarak özgün hazırlanır.
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          {BENEFITS.map((benefit) => (
            <li key={benefit.title} className="flex gap-3">
              <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-brand/20 text-[0.6rem] text-brand-soft">
                ✓
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold text-ink">
                  {benefit.title}
                </span>
                <span className="text-sm text-ink-muted">{benefit.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="order-1 lg:order-2">
        <Card className="animate-rise">
          <CardHeader>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="pb-6">{children}</CardContent>
        </Card>
      </section>
    </div>
  );
}
