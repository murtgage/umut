import type { Metadata } from "next";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber, formatPercent, rankTone } from "@/lib/format";
import {
  countRankedPlayers,
  getGlobalLeaderboard,
  getPlayerRank,
  type LeaderboardRow,
} from "@/lib/leaderboard";
import { getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Sıralama",
  description:
    "Umut KPSS Arena genel sıralaması: en yüksek puanlı oyuncular, seviyeler ve isabet oranları.",
};

/** İlk üç sıra için renk tonu — tabloda ve mobil kartta ortak kullanılır. */
function rankBadgeClass(tone: ReturnType<typeof rankTone>): string {
  return cn(
    "tnum grid place-items-center rounded-lg border font-bold",
    tone === "gold" && "border-gold/50 bg-gold/15 text-gold",
    tone === "silver" && "border-ink-muted/40 bg-ink-muted/10 text-ink",
    tone === "bronze" && "border-warning/40 bg-warning/10 text-warning",
    tone === "plain" && "border-line bg-canvas/50 text-ink-muted",
  );
}

export default async function LeaderboardPage() {
  const session = await getSession();

  const [rows, totalPlayers, myRank] = await Promise.all([
    getGlobalLeaderboard({ limit: 50 }),
    countRankedPlayers(),
    session ? getPlayerRank(session.user.id) : Promise.resolve(null),
  ]);

  const myId = session?.user.id ?? null;
  const inTopList = myId ? rows.some((row) => row.userId === myId) : false;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Genel sıralama
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Sıralama toplam puana göre belirlenir; eşit puanda daha çok doğru
            yapan öne geçer.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col rounded-xl border border-line bg-canvas/40 px-4 py-2">
            <span className="text-[0.65rem] tracking-wide text-ink-faint uppercase">
              Sıralanan oyuncu
            </span>
            <span className="tnum text-lg font-bold text-ink">
              {formatNumber(totalPlayers)}
            </span>
          </div>
          {myRank ? (
            <div className="flex flex-col rounded-xl border border-brand/40 bg-brand/10 px-4 py-2">
              <span className="text-[0.65rem] tracking-wide text-brand-soft uppercase">
                Senin yerin
              </span>
              <span className="tnum text-lg font-bold text-brand-soft">
                #{formatNumber(myRank)}
              </span>
            </div>
          ) : null}
        </div>
      </header>

      {myRank && !inTopList ? (
        <p className="rounded-xl border border-brand/30 bg-brand/10 px-4 py-2.5 text-sm text-brand-soft">
          İlk 50&apos;nin dışındasın — daha fazla tur oynayarak yüksel.
        </p>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-3xl">🏁</p>
              <p className="font-semibold text-ink">
                Henüz kimse yarışmadı
              </p>
              <p className="max-w-sm text-sm text-ink-muted">
                İlk turu sen tamamla ve sıralamanın tepesine yerleş.
              </p>
              <Link href="/oyna" className={buttonVariants({ size: "lg" })}>
                Hemen oyna
              </Link>
            </div>
          ) : (
            <>
              {/* Telefon: tablo yerine kart listesi — yatay kaydırma gerekmez. */}
              <ul className="flex flex-col gap-2 sm:hidden">
                {rows.map((row) => (
                  <li key={row.userId}>
                    <LeaderboardCard row={row} isMe={row.userId === myId} />
                  </li>
                ))}
              </ul>

              {/* Geniş ekran: tam tablo görünümü. */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-xs tracking-wide text-ink-faint uppercase">
                      <th className="px-3 py-2 font-medium">#</th>
                      <th className="px-3 py-2 font-medium">Oyuncu</th>
                      <th className="px-3 py-2 text-right font-medium">Puan</th>
                      <th className="px-3 py-2 text-right font-medium">Doğru</th>
                      <th className="px-3 py-2 text-right font-medium">İsabet</th>
                      <th className="px-3 py-2 text-right font-medium">Tur</th>
                      <th className="px-3 py-2 text-right font-medium">Seviye</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <LeaderboardTableRow
                        key={row.userId}
                        row={row}
                        isMe={row.userId === myId}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LeaderboardTableRow({
  row,
  isMe,
}: {
  row: LeaderboardRow;
  isMe: boolean;
}) {
  const tone = rankTone(row.rank);

  return (
    <tr
      className={cn(
        "border-t border-line transition",
        isMe ? "bg-brand/10" : "hover:bg-elevated/50",
      )}
    >
      <td className="px-3 py-3">
        <span className={cn(rankBadgeClass(tone), "size-7 text-xs")}>
          {row.rank}
        </span>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={row.name} image={row.image} size="sm" />
          <div className="flex flex-col">
            <span className="flex items-center gap-2 font-medium text-ink">
              {row.name}
              {isMe ? <Badge tone="brand">sen</Badge> : null}
            </span>
            <span className="text-xs text-ink-faint">
              En iyi tur: <span className="tnum">{formatNumber(row.bestScore)}</span>{" "}
              · Seri <span className="tnum">{row.longestStreak}</span>
            </span>
          </div>
        </div>
      </td>
      <td className="tnum px-3 py-3 text-right font-bold text-brand-soft">
        {formatNumber(row.totalScore)}
      </td>
      <td className="tnum px-3 py-3 text-right text-ink-muted">
        {formatNumber(row.correctAnswers)}
      </td>
      <td className="tnum px-3 py-3 text-right text-ink-muted">
        {formatPercent(row.accuracy)}
      </td>
      <td className="tnum px-3 py-3 text-right text-ink-faint">
        {formatNumber(row.gamesPlayed)}
      </td>
      <td className="px-3 py-3 text-right">
        <Badge tone={row.level >= 10 ? "gold" : "neutral"}>Sv. {row.level}</Badge>
      </td>
    </tr>
  );
}

/** Küçük ekranlarda tablo yerine kullanılan kompakt satır kartı. */
function LeaderboardCard({
  row,
  isMe,
}: {
  row: LeaderboardRow;
  isMe: boolean;
}) {
  const tone = rankTone(row.rank);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-line px-3 py-2.5",
        isMe ? "bg-brand/10" : "bg-canvas/40",
      )}
    >
      <span className={cn(rankBadgeClass(tone), "size-8 shrink-0 text-xs")}>
        {row.rank}
      </span>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar name={row.name} image={row.image} size="sm" />
          <span className="truncate font-medium text-ink">{row.name}</span>
          {isMe ? <Badge tone="brand">sen</Badge> : null}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-faint">
          <span className="tnum font-semibold text-brand-soft">
            {formatNumber(row.totalScore)} puan
          </span>
          <span className="tnum">{formatNumber(row.correctAnswers)} doğru</span>
          <span className="tnum">{formatPercent(row.accuracy)}</span>
          <span className="tnum">{formatNumber(row.gamesPlayed)} tur</span>
        </div>
      </div>

      <Badge tone={row.level >= 10 ? "gold" : "neutral"}>Sv. {row.level}</Badge>
    </div>
  );
}
