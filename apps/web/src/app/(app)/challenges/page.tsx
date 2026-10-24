import { ChallengesCatalog } from "@/components/challenges/challenges-catalog";
import { loadChallengeCatalog } from "@/lib/challenges-server";

export default async function ChallengesPage() {
  const catalog = await loadChallengeCatalog();
  return <ChallengesCatalog initialCatalog={catalog} />;
}
