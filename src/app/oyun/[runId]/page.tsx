import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { GameBoard } from "@/components/game/game-board";
import { GameError, getRunView } from "@/lib/game";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Tur",
  robots: { index: false },
};

export default async function RunPage(props: PageProps<"/oyun/[runId]">) {
  const session = await requireUser();
  const { runId } = await props.params;

  let view;
  try {
    view = await getRunView(runId, session.user.id);
  } catch (error) {
    if (error instanceof GameError) notFound();
    throw error;
  }

  // Bitmiş ya da tamamlanmış turu sonuç ekranına gönder.
  if (view.status !== "IN_PROGRESS" || view.answered.length >= view.totalQuestions) {
    redirect(`/oyun/${runId}/sonuc`);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <GameBoard view={view} />
    </div>
  );
}
