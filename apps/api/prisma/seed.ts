import "dotenv/config";
import {
  EXERCISE_LIMITS,
  SKILL_CATALOG,
  STARTER_COURSES,
  STARTER_EXERCISES,
  STARTER_RESOURCES,
  STARTER_ROADMAPS,
  type CourseExerciseSeed,
  type ExerciseConfig,
} from "@coddle/shared";
import { PrismaClient } from "@prisma/client";
import { config } from "../src/config.js";
import { courseThumbnailSvg, uploadToR2 } from "../src/shared/r2.js";

const prisma = new PrismaClient();

async function seedSkills() {
  for (const skill of SKILL_CATALOG) {
    await prisma.skill.upsert({
      where: { slug: skill.slug },
      create: {
        slug: skill.slug,
        name: skill.name,
        category: skill.category,
      },
      update: {
        name: skill.name,
        category: skill.category,
      },
    });
  }
}

/** Upserts by URL and never deletes, so community submissions are untouched. */
async function seedResources(): Promise<Map<string, string>> {
  const skills = await prisma.skill.findMany();
  const skillIdBySlug = new Map(skills.map((skill) => [skill.slug, skill.id]));
  const resourceIdByUrl = new Map<string, string>();

  for (const resource of STARTER_RESOURCES) {
    const data = {
      title: resource.title,
      description: resource.description,
      type: resource.type,
      level: resource.level,
      status: "published",
    };
    const saved = await prisma.resource.upsert({
      where: { url: resource.url },
      create: { ...data, url: resource.url, publishedAt: new Date() },
      update: data,
    });
    resourceIdByUrl.set(resource.url, saved.id);

    await prisma.resourceSkill.deleteMany({ where: { resourceId: saved.id } });
    for (const skillSlug of resource.skillSlugs) {
      const skillId = skillIdBySlug.get(skillSlug);
      if (!skillId) {
        throw new Error(`Missing skill slug for resource seed: ${skillSlug}`);
      }
      await prisma.resourceSkill.create({ data: { resourceId: saved.id, skillId } });
    }
  }

  return resourceIdByUrl;
}

async function seedRoadmaps(resourceIdByUrl: Map<string, string>) {
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
      const savedStep = await prisma.roadmapStep.upsert({
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
        },
        update: {
          title: step.title,
          summary: step.summary,
          estimatedMinutes: step.estimatedMinutes,
          sortOrder: stepIndex,
          learnings: [...step.learnings],
          practice: step.practice,
          branchKey: step.branchKey ?? null,
        },
      });

      await prisma.roadmapStepResource.deleteMany({ where: { stepId: savedStep.id } });
      await prisma.roadmapStepResource.createMany({
        data: step.resources.map((url, sortOrder) => {
          const resourceId = resourceIdByUrl.get(url);
          if (!resourceId) {
            throw new Error(`Roadmap step ${roadmap.slug}/${step.slug} links unknown resource ${url}`);
          }
          return { stepId: savedStep.id, resourceId, sortOrder };
        }),
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
}

async function resolveCourseCreator() {
  const email = config.seedCourseCreatorEmail.toLowerCase();
  const creator = await prisma.user.findUnique({ where: { email } });
  if (!creator) {
    throw new Error(
      `Course seed needs Learn user ${email}. Sign in once, then re-run seed.`,
    );
  }
  return creator;
}

async function uploadCourseThumbnail(course: (typeof STARTER_COURSES)[number]) {
  const svg = courseThumbnailSvg({
    title: course.title,
    level: course.level,
    accent: course.accent,
  });
  const { url } = await uploadToR2({
    path: `courses/${course.slug}/thumbnail.svg`,
    body: svg,
    contentType: "image/svg+xml",
  });
  return url;
}

/**
 * Matches exercises by position so re-seeding keeps learner submissions. A kind
 * change at a position replaces that exercise.
 */
async function seedExercises(lessonId: string, seeds: readonly CourseExerciseSeed[]) {
  const existing = await prisma.courseExercise.findMany({
    where: { lessonId },
    orderBy: { sortOrder: "asc" },
  });

  for (const [index, seed] of seeds.entries()) {
    const config: ExerciseConfig = {
      requirements: [...(seed.requirements ?? [])],
      questions: (seed.questions ?? []).map((question) => ({
        ...question,
        options: question.options.map((option) => ({ ...option })),
      })),
      passPercent: seed.passPercent ?? EXERCISE_LIMITS.passPercentDefault,
    };
    const data = {
      title: seed.title,
      instructions: seed.instructions,
      hint: seed.hint ?? "",
      solution: seed.solution ?? "",
      estimatedMinutes: seed.estimatedMinutes,
      sortOrder: index,
      config,
    };
    const current = existing[index];
    if (current && current.kind === seed.kind) {
      await prisma.courseExercise.update({ where: { id: current.id }, data });
      continue;
    }
    if (current) await prisma.courseExercise.delete({ where: { id: current.id } });
    await prisma.courseExercise.create({ data: { ...data, lessonId, kind: seed.kind } });
  }

  const extra = existing.slice(seeds.length).map((exercise) => exercise.id);
  if (extra.length > 0) {
    await prisma.courseExercise.deleteMany({ where: { id: { in: extra } } });
  }
}

async function seedCourses() {
  const creator = await resolveCourseCreator();
  const skills = await prisma.skill.findMany();
  const skillIdBySlug = new Map(skills.map((skill) => [skill.slug, skill.id]));

  for (const [index, course] of STARTER_COURSES.entries()) {
    const thumbnailUrl = await uploadCourseThumbnail(course);

    const now = new Date();
    const saved = await prisma.course.upsert({
      where: { slug: course.slug },
      create: {
        slug: course.slug,
        title: course.title,
        summary: course.summary,
        level: course.level,
        status: "published",
        accent: course.accent,
        thumbnailUrl,
        estimatedHours: course.estimatedHours,
        sortOrder: index,
        submittedAt: now,
        reviewedAt: now,
        publishedAt: now,
        createdByUserId: creator.id,
      },
      update: {
        title: course.title,
        summary: course.summary,
        level: course.level,
        status: "published",
        accent: course.accent,
        thumbnailUrl,
        customThumbnail: false,
        estimatedHours: course.estimatedHours,
        sortOrder: index,
        createdByUserId: creator.id,
      },
    });

    const keepModuleSlugs = new Set<string>();

    for (const [moduleIndex, courseModule] of course.modules.entries()) {
      keepModuleSlugs.add(courseModule.slug);
      const savedModule = await prisma.courseModule.upsert({
        where: {
          courseId_slug: {
            courseId: saved.id,
            slug: courseModule.slug,
          },
        },
        create: {
          courseId: saved.id,
          slug: courseModule.slug,
          title: courseModule.title,
          summary: courseModule.summary,
          sortOrder: moduleIndex,
        },
        update: {
          title: courseModule.title,
          summary: courseModule.summary,
          sortOrder: moduleIndex,
        },
      });

      const keepLessonSlugs = new Set<string>();
      for (const [lessonIndex, courseLesson] of courseModule.lessons.entries()) {
        keepLessonSlugs.add(courseLesson.slug);
        const savedLesson = await prisma.courseLesson.upsert({
          where: {
            moduleId_slug: {
              moduleId: savedModule.id,
              slug: courseLesson.slug,
            },
          },
          create: {
            moduleId: savedModule.id,
            slug: courseLesson.slug,
            title: courseLesson.title,
            summary: courseLesson.summary,
            content: courseLesson.content,
            estimatedMinutes: courseLesson.estimatedMinutes,
            sortOrder: lessonIndex,
          },
          update: {
            title: courseLesson.title,
            summary: courseLesson.summary,
            content: courseLesson.content,
            estimatedMinutes: courseLesson.estimatedMinutes,
            sortOrder: lessonIndex,
          },
        });
        await seedExercises(
          savedLesson.id,
          STARTER_EXERCISES[`${course.slug}/${courseModule.slug}/${courseLesson.slug}`] ?? [],
        );
      }

      await prisma.courseLesson.deleteMany({
        where: {
          moduleId: savedModule.id,
          slug: { notIn: [...keepLessonSlugs] },
        },
      });
    }

    await prisma.courseModule.deleteMany({
      where: {
        courseId: saved.id,
        slug: { notIn: [...keepModuleSlugs] },
      },
    });

    await prisma.courseSkill.deleteMany({ where: { courseId: saved.id } });
    for (const skillSlug of course.skillSlugs) {
      const skillId = skillIdBySlug.get(skillSlug);
      if (!skillId) {
        throw new Error(`Missing skill slug for course seed: ${skillSlug}`);
      }
      await prisma.courseSkill.create({
        data: { courseId: saved.id, skillId },
      });
    }
  }

  console.log(
    `Seeded ${STARTER_COURSES.length} courses (creator: ${creator.email}).`,
  );
}

async function main() {
  await seedSkills();
  const resourceIdByUrl = await seedResources();
  console.log(`Seeded ${STARTER_RESOURCES.length} resources.`);
  await seedRoadmaps(resourceIdByUrl);
  console.log(`Seeded ${STARTER_ROADMAPS.length} roadmaps.`);
  await seedCourses();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
