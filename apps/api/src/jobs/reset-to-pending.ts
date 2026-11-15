import { prisma } from "../shared/db.js";

async function main() {
  const query = process.argv.slice(2).join(" ").trim() || "Asha";

  console.log(`\nSearching for content matching "${query}" to reset status to pending...\n`);

  // Search Tool
  const tools = await prisma.tool.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { slug: { contains: query, mode: "insensitive" } },
      ],
    },
  });

  // Search Course
  const courses = await prisma.course.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { slug: { contains: query, mode: "insensitive" } },
      ],
    },
  });

  // Search Project
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { slug: { contains: query, mode: "insensitive" } },
      ],
    },
  });

  // Search Resource
  const resources = await prisma.resource.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { url: { contains: query, mode: "insensitive" } },
      ],
    },
  });

  if (
    tools.length === 0 &&
    courses.length === 0 &&
    projects.length === 0 &&
    resources.length === 0
  ) {
    console.log(`No items found matching "${query}". Check the title or slug and try again.`);
    process.exit(1);
  }

  for (const tool of tools) {
    await prisma.tool.update({
      where: { id: tool.id },
      data: {
        status: "pending",
        publishedAt: null,
        reviewedAt: null,
        reviewedByUserId: null,
        reviewNote: null,
        flaggedAt: null,
      },
    });
    console.log(`✓ Reset Tool: "${tool.title}" (${tool.slug}) -> status: pending`);
  }

  for (const course of courses) {
    await prisma.course.update({
      where: { id: course.id },
      data: {
        status: "in_review",
        publishedAt: null,
        reviewedAt: null,
        reviewedByUserId: null,
        reviewNote: null,
        flaggedAt: null,
      },
    });
    console.log(`✓ Reset Course: "${course.title}" (${course.slug}) -> status: in_review`);
  }

  for (const project of projects) {
    await prisma.project.update({
      where: { id: project.id },
      data: {
        status: "in_review",
        publishedAt: null,
        reviewedAt: null,
        reviewedByUserId: null,
        reviewNote: null,
        flaggedAt: null,
      },
    });
    console.log(`✓ Reset Project: "${project.title}" (${project.slug}) -> status: in_review`);
  }

  for (const resource of resources) {
    await prisma.resource.update({
      where: { id: resource.id },
      data: {
        status: "pending",
        publishedAt: null,
        reviewedAt: null,
        reviewedByUserId: null,
        reviewNote: null,
        flaggedAt: null,
      },
    });
    console.log(`✓ Reset Resource: "${resource.title}" -> status: pending`);
  }

  console.log(
    `\nSuccess! The item(s) are now back in the pending review queue.\nGo to your Reviewers page (/reviewers), approve it again, and the emails will be sent out!\n`,
  );
}

main()
  .catch((err) => {
    console.error("Error resetting status:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
