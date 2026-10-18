import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 px-4 py-24 text-center">
      <p className="text-5xl">🧭</p>
      <h1 className="text-2xl font-bold tracking-tight text-ink">
        Burada bir şey yok
      </h1>
      <p className="text-sm leading-relaxed text-ink-muted">
        Aradığın sayfa kaldırılmış ya da hiç var olmamış olabilir. Endişelenme —
        seni oyuna geri götürelim.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/oyna" className={buttonVariants({ size: "lg" })}>
          Oyna
        </Link>
        <Link
          href="/"
          className={buttonVariants({ variant: "secondary", size: "lg" })}
        >
          Ana sayfa
        </Link>
      </div>
    </div>
  );
}
