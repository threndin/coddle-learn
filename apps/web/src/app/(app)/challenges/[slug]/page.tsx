import { notFound } from "next/navigation";
import { ChallengeDetailView } from "@/components/challenges/challenge-detail";
import { loadChallenge } from "@/lib/challenges-server";

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const challenge = await loadChallenge(slug);
  if (!challenge) notFound();
  return <ChallengeDetailView initial={challenge} />;
}
