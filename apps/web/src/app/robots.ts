import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://learn.usecoddle.com"
  ).replace(/\/$/, "");

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/",
        "/notifications",
        "/notifications/",
        "/assistant",
        "/assistant/",
        "/assessments",
        "/assessments/",
        "/onboarding",
        "/mentors/me",
        "/api/",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

