import "dotenv/config";
import {
  SKILL_CATALOG,
  STARTER_COURSES,
  STARTER_ROADMAPS,
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

async function seedRoadmaps() {
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
        await prisma.courseLesson.upsert({
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
  await seedRoadmaps();
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
