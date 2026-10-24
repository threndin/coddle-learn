import { prisma } from "../src/shared/db.js";
import { submitChallengeSolution } from "../src/features/challenges/challenges.service.js";
import { STARTER_CHALLENGES } from "../src/features/challenges/starter-challenges.js";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) throw new Error("No user available for the challenge check.");
  const before = user.points;
  const challenge = STARTER_CHALLENGES[0];
  if (!challenge) throw new Error("Missing starter challenge.");

  const failed = await submitChallengeSolution(user.id, challenge.slug, {
    code: challenge.starterCode,
  });
  if (failed.status !== "failed" || failed.pointsAwarded !== 0) {
    throw new Error(`Expected a failed run, got ${failed.status} / ${failed.pointsAwarded}`);
  }
  if (failed.results.some((result) => result.hidden && (result.expectedJson || result.actualJson))) {
    throw new Error("Hidden tests leaked expected or actual values.");
  }

  await sleep(1100);
  const passed = await submitChallengeSolution(user.id, challenge.slug, {
    code: challenge.solution,
  });
  if (passed.status !== "passed" || passed.rank !== 1 || passed.pointsAwarded !== 90) {
    throw new Error(
      `Expected first solve for 90 points, got rank ${passed.rank} and ${passed.pointsAwarded} points`,
    );
  }
  if (passed.userPoints !== before + 90) {
    throw new Error(`Points did not increase. before ${before} after ${passed.userPoints}`);
  }

  await sleep(1100);
  const again = await submitChallengeSolution(user.id, challenge.slug, {
    code: challenge.solution,
  });
  if (!again.alreadySolved || again.pointsAwarded !== 0 || again.userPoints !== before + 90) {
    throw new Error("A second pass changed points or rank rewards.");
  }

  let blocked = false;
  try {
    await submitChallengeSolution(user.id, challenge.slug, {
      code: "require('fs')\nfunction sumArray(){return 0}",
    });
  } catch {
    blocked = true;
  }
  if (!blocked) throw new Error("Blocked code was accepted.");

  const row = await prisma.challenge.findUnique({ where: { slug: challenge.slug } });
  if (!row) throw new Error("Challenge row missing.");
  await prisma.challengeSolve.deleteMany({ where: { userId: user.id, challengeId: row.id } });
  await prisma.challengeSubmission.deleteMany({ where: { userId: user.id, challengeId: row.id } });
  await prisma.userPointEvent.deleteMany({
    where: { userId: user.id, refType: "challenge", refId: row.id },
  });
  await prisma.user.update({ where: { id: user.id }, data: { points: before } });
  const restored = await prisma.user.findUnique({
    where: { id: user.id },
    select: { points: true },
  });
  if (restored?.points !== before) throw new Error("Failed to restore points after the check.");
  console.log("challenge flow ok");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
