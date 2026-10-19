import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DuelBoard } from "@/components/game/duel-board";
import { getDuelView } from "@/lib/duel";
import { requireVerifiedUser } from "@/lib/session";

export async function generateMetadata(
  props: PageProps<"/duello/[duelId]">,
): Promise<Metadata> {
  return {
    title: "Düello",
    robots: { index: false },
  };
}

export default async function DuelPage(props: PageProps<"/duello/[duelId]">) {
  const session = await requireVerifiedUser(`/duello/${(await props.params).duelId}`);
  const { duelId } = await props.params;

  const view = await getDuelView(duelId, session.user.id);
  if (!view) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <DuelBoard view={view} />
    </div>
  );
}
