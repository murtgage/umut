import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ResultView } from "@/components/game/result-view";
import { GameError, getSummary } from "@/lib/game";
import { getPlayerRank } from "@/lib/leaderboard";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Tur sonucu",
  robots: { index: false },
};

export default async function ResultPage(props: PageProps<"/oyun/[runId]/sonuc">) {
  const session = await requireUser();
  const { runId } = await props.params;

  let summary;
  try {
    summary = await getSummary(runId, session.user.id);
  } catch (error) {
    if (error instanceof GameError) notFound();
    throw error;
  }

  const rank = await getPlayerRank(session.user.id);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <ResultView summary={summary} rank={rank} />
    </div>
  );
}
