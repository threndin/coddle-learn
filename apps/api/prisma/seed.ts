import { STARTER_ROADMAPS } from "@coddle/shared";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  for (const [index, roadmap] of STARTER_ROADMAPS.entries()) {
    const saved = await prisma.roadmap.upsert({
      where: { slug: roadmap.slug },
      create: {
        slug: roadmap.slug,
        name: roadmap.name,
        level: roadmap.level,
        summary: roadmap.summary,
        weeks: roadmap.weeks,
        skillSlugs: [...roadmap.skillSlugs],
        sortOrder: index,
      },
      update: {
        name: roadmap.name,
        level: roadmap.level,
        summary: roadmap.summary,
        weeks: roadmap.weeks,
        skillSlugs: [...roadmap.skillSlugs],
        sortOrder: index,
      },
    });

    const keepSlugs = new Set<string>();

    for (const [stepIndex, step] of roadmap.steps.entries()) {
      keepSlugs.add(step.slug);
      await prisma.roadmapStep.upsert({
        where: {
          roadmapId_slug: {
            roadmapId: saved.id,
            slug: step.slug,
          },
        },
        create: {
          roadmapId: saved.id,
          slug: step.slug,
          title: step.title,
          summary: step.summary,
          estimatedMinutes: step.estimatedMinutes,
          sortOrder: stepIndex,
          learnings: [...step.learnings],
          practice: step.practice,
          branchKey: step.branchKey ?? null,
          resources: [...step.resources],
        },
        update: {
          title: step.title,
          summary: step.summary,
          estimatedMinutes: step.estimatedMinutes,
          sortOrder: stepIndex,
          learnings: [...step.learnings],
          practice: step.practice,
          branchKey: step.branchKey ?? null,
          resources: [...step.resources],
        },
      });
    }

    await prisma.roadmapStep.deleteMany({
      where: {
        roadmapId: saved.id,
        slug: { notIn: [...keepSlugs] },
      },
    });
  }

  const keepRoadmapSlugs = STARTER_ROADMAPS.map((roadmap) => roadmap.slug);
  await prisma.roadmap.deleteMany({
    where: { slug: { notIn: keepRoadmapSlugs } },
  });

  console.log(`Seeded ${STARTER_ROADMAPS.length} roadmaps.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
