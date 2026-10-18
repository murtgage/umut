import Link from "next/link";

import { Logo } from "@/components/logo";
import { getSession } from "@/lib/session";

export async function SiteFooter() {
  const session = await getSession();

  return (
    <footer className="mt-16 border-t border-line/80 bg-canvas/60">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <Logo withTagline={false} />
          <p className="max-w-sm text-sm leading-relaxed text-ink-muted">
            Umut, KPSS&apos;ye hazırlananlar için tasarlanmış bir bilgi
            yarışmasıdır. Sorular KPSS formatı örnek alınarak özgün olarak
            hazırlanır; resmî sınav sorusu içermez.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold tracking-[0.18em] text-ink-faint uppercase">
            Oyna
          </h3>
          <Link href="/oyna" className="text-sm text-ink-muted hover:text-ink">
            Hızlı tur
          </Link>
          <Link
            href="/oyna?mod=kategori"
            className="text-sm text-ink-muted hover:text-ink"
          >
            Kategori seç
          </Link>
          <Link href="/siralama" className="text-sm text-ink-muted hover:text-ink">
            Genel sıralama
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold tracking-[0.18em] text-ink-faint uppercase">
            Hesap
          </h3>

          {session ? (
            <>
              <Link
                href="/profil"
                className="text-sm text-ink-muted hover:text-ink"
              >
                Profilim
              </Link>
              <Link
                href="/oyna"
                className="text-sm text-ink-muted hover:text-ink"
              >
                Yeni tur başlat
              </Link>
              <Link
                href="/siralama"
                className="text-sm text-ink-muted hover:text-ink"
              >
                Sıralamam
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/giris"
                className="text-sm text-ink-muted hover:text-ink"
              >
                Giriş yap
              </Link>
              <Link
                href="/kayit"
                className="text-sm text-ink-muted hover:text-ink"
              >
                Kayıt ol
              </Link>
              <Link
                href="/siralama"
                className="text-sm text-ink-muted hover:text-ink"
              >
                Genel sıralama
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-line/60 px-4 py-4 sm:px-6">
        <p className="mx-auto w-full max-w-6xl text-xs text-ink-faint">
          © {new Date().getFullYear()} Umut · Bağımsız bir çalışma aracıdır,
          ÖSYM ile bağlantılı değildir.
        </p>
      </div>
    </footer>
  );
}
