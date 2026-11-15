import type { MetadataRoute } from "next";
import {
  ACHIEVEMENT_DEFINITIONS,
  STARTER_COURSES,
  STARTER_PROJECTS,
  STARTER_ROADMAPS,
  STARTER_TOOLS,
} from "@coddle/shared";

export const revalidate = 3600;

interface SitemapApiResponse {
  data: {
    courses: Array<{ slug: string; updatedAt: string }>;
    roadmaps: Array<{ slug: string; updatedAt: string }>;
    projects: Array<{ slug: string; updatedAt: string }>;
    challenges: Array<{ slug: string; updatedAt: string }>;
    tools: Array<{ slug: string; updatedAt: string }>;
    achievements: Array<{ slug: string }>;
    community: Array<{ slug: string; updatedAt: string }>;
    users: Array<{ username: string; updatedAt: string }>;
    mentors: Array<{ username: string; updatedAt: string }>;
    credentials: Array<{ code: string; issuedAt: string }>;
  };
}

async function fetchDynamicData(): Promise<SitemapApiResponse["data"] | null> {
  const apiUrl = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");
  try {
    const res = await fetch(`${apiUrl}/sitemap`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as SitemapApiResponse;
    return json.data;
  } catch {
    return null;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://learn.usecoddle.com"
  ).replace(/\/$/, "");

  const now = new Date();

  // Core static public pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/courses`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/roadmaps`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/projects`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/challenges`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/community`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/community/search`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/resources`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/skills`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/leaderboard`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/mentors`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/achievements`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/badges`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/reviewers`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];

  const dynamicData = await fetchDynamicData();

  if (dynamicData) {
    const courses: MetadataRoute.Sitemap = dynamicData.courses.map((item) => ({
      url: `${baseUrl}/courses/${item.slug}`,
      lastModified: new Date(item.updatedAt),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    const roadmaps: MetadataRoute.Sitemap = dynamicData.roadmaps.map((item) => ({
      url: `${baseUrl}/roadmaps/${item.slug}`,
      lastModified: new Date(item.updatedAt),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    const projects: MetadataRoute.Sitemap = dynamicData.projects.map((item) => ({
      url: `${baseUrl}/projects/${item.slug}`,
      lastModified: new Date(item.updatedAt),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    const challenges: MetadataRoute.Sitemap = dynamicData.challenges.map((item) => ({
      url: `${baseUrl}/challenges/${item.slug}`,
      lastModified: new Date(item.updatedAt),
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    const tools: MetadataRoute.Sitemap = dynamicData.tools.map((item) => ({
      url: `${baseUrl}/tools/${item.slug}`,
      lastModified: new Date(item.updatedAt),
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    const achievements: MetadataRoute.Sitemap = dynamicData.achievements.map((item) => ({
      url: `${baseUrl}/achievements/${item.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    }));

    const community: MetadataRoute.Sitemap = dynamicData.community.map((item) => ({
      url: `${baseUrl}/community/${item.slug}`,
      lastModified: new Date(item.updatedAt),
      changeFrequency: "daily",
      priority: 0.6,
    }));

    const users: MetadataRoute.Sitemap = dynamicData.users.map((item) => ({
      url: `${baseUrl}/u/${item.username}`,
      lastModified: new Date(item.updatedAt),
      changeFrequency: "weekly",
      priority: 0.5,
    }));

    const mentors: MetadataRoute.Sitemap = dynamicData.mentors.map((item) => ({
      url: `${baseUrl}/mentors/${item.username}`,
      lastModified: new Date(item.updatedAt),
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    const credentials: MetadataRoute.Sitemap = dynamicData.credentials.map((item) => ({
      url: `${baseUrl}/verify/${item.code}`,
      lastModified: new Date(item.issuedAt),
      changeFrequency: "monthly",
      priority: 0.4,
    }));

    return [
      ...staticRoutes,
      ...courses,
      ...roadmaps,
      ...projects,
      ...challenges,
      ...tools,
      ...achievements,
      ...community,
      ...mentors,
      ...users,
      ...credentials,
    ];
  }

  // Fallback if API is offline or during offline build
  const fallbackCourses: MetadataRoute.Sitemap = STARTER_COURSES.map((item) => ({
    url: `${baseUrl}/courses/${item.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const fallbackRoadmaps: MetadataRoute.Sitemap = STARTER_ROADMAPS.map((item) => ({
    url: `${baseUrl}/roadmaps/${item.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const fallbackProjects: MetadataRoute.Sitemap = STARTER_PROJECTS.map((item) => ({
    url: `${baseUrl}/projects/${item.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const fallbackTools: MetadataRoute.Sitemap = STARTER_TOOLS.map((item) => ({
    url: `${baseUrl}/tools/${item.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const fallbackAchievements: MetadataRoute.Sitemap = ACHIEVEMENT_DEFINITIONS.map((item) => ({
    url: `${baseUrl}/achievements/${item.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [
    ...staticRoutes,
    ...fallbackCourses,
    ...fallbackRoadmaps,
    ...fallbackProjects,
    ...fallbackTools,
    ...fallbackAchievements,
  ];
}

