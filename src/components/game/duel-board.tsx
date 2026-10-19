"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { joinDuelAction } from "@/app/oyun/actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDuration, formatNumber } from "@/lib/format";
import type { DuelPlayerView, DuelView } from "@/lib/duel";
import { cn } from "@/lib/utils";

const DUEL_URL = "https://umut.vercel.app";

function PlayerPanel({ player }: { player: DuelPlayerView }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border p-4",
        player.isCurrentUser
          ? "border-brand/40 bg-brand/5"
          : "border-line bg-canvas/40",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold text-ink">{player.name}</p>
        {player.isCurrentUser ? <Badge tone="brand">sen</Badge> : null}
      </div>
      <p className="tnum text-2xl font-bold text-ink">
        {formatNumber(player.score)}
      </p>
      <dl className="flex flex-col gap-1 text-xs text-ink-muted">
        <div className="flex items-center justify-between">
          <dt>Doğru</dt>
          <dd className="tnum text-success">{player.correctCount}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>Yanlış</dt>
          <dd className="tnum text-danger">{player.wrongCount}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>Boş</dt>
          <dd className="tnum">{player.skippedCount}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>Seri</dt>
          <dd className="tnum">{player.bestStreak}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>Süre</dt>
          <dd className="tnum">
            {player.finished ? formatDuration(player.durationMs) : "sürüyor"}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function DuelBoard({ view }: { view: DuelView }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const inviteUrl = `${DUEL_URL}/duello/${view.id}`;
  const isChallenger = view.role === "CHALLENGER";
  const isGuest = view.role === "GUEST";
  const me = view.challenger.isCurrentUser
    ? view.challenger
    : view.opponent?.isCurrentUser
      ? view.opponent
      : null;

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  async function join() {
    setJoining(true);
    setJoinError(null);
    const result = await joinDuelAction({ duelId: view.id });
    setJoining(false);
    if (!result.ok) {
      setJoinError(result.error);
      return;
    }
    router.push(`/oyun/${result.data.runId}`);
  }

  const statusBadge = view.finished ? (
    <Badge tone="neutral">Düello bitti</Badge>
  ) : view.status === "OPEN" ? (
    <Badge tone="warning">Rakip bekleniyor</Badge>
  ) : (
    <Badge tone="brand">Düello sürüyor</Badge>
  );

  const winnerName =
    view.winner === "CHALLENGER"
      ? view.challenger.name
      : view.winner === "OPPONENT"
        ? view.opponent?.name
        : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">Düello</h1>
          <p className="text-sm text-ink-muted">
            {view.questionCount} soru · en yüksek puan kazanır
          </p>
        </div>
        <div className="flex items-center gap-2">
          {statusBadge}
          {view.finished && view.winner ? (
            <Badge tone="gold">
              {view.winner === "TIE"
                ? "Berabere!"
                : `${winnerName ?? "Rakip"} kazandı!`}
            </Badge>
          ) : null}
        </div>
      </div>

      {isGuest ? (
        <Card>
          <CardHeader>
            <CardTitle>Bu düello sana ait değil</CardTitle>
            <CardDescription>
              Davet bağlantısı seninle paylaşıldı. Katılmak için aşağıdaki
              butonu kullan.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button onClick={() => void join()} disabled={joining}>
              {joining ? "Katılıyor…" : "Düelloya katıl"}
            </Button>
            {joinError ? (
              <p className="text-sm text-danger" role="alert">
                {joinError}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {isChallenger && view.status === "OPEN" ? (
        <Card>
          <CardHeader>
            <CardTitle>Arkadaşını davet et</CardTitle>
            <CardDescription>
              Bu bağlantıyı gönder; aynı sorularda yarışsın.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <code className="block truncate rounded-lg border border-line bg-canvas/60 px-3 py-2 text-sm text-ink">
              {inviteUrl}
            </code>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => void copyInvite()}>
                {copied ? "Kopyalandı ✓" : "Bağlantıyı kopyala"}
              </Button>
              <Link
                href={`/oyun/${view.myRunId}`}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Kendi turuna başla →
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <PlayerPanel player={view.challenger} />
        {view.opponent ? (
          <PlayerPanel player={view.opponent} />
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-line p-4 text-sm text-ink-faint">
            Rakip bekleniyor…
          </div>
        )}
      </div>

      {me ? (
        <div className="flex flex-wrap gap-2">
          {me.finished ? (
            <Link
              href={`/oyun/${view.myRunId}/sonuc`}
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              Tur sonucunu gör
            </Link>
          ) : (
            <Link
              href={`/oyun/${view.myRunId}`}
              className={buttonVariants({ size: "sm" })}
            >
              Tura devam et →
            </Link>
          )}
        </div>
      ) : null}
    </div>
  );
}
