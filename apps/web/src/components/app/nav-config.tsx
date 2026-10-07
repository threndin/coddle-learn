import type { ReactNode } from "react";

export type AppNavItem = {
  href: string;
  label: string;
  description: string;
  icon: NavIconId;
};

export type NavIconId =
  | "dashboard"
  | "roadmaps"
  | "courses"
  | "resources"
  | "projects"
  | "assessments"
  | "credentials"
  | "community"
  | "mentorship"
  | "badges"
  | "notifications"
  | "profile"
  | "studio"
  | "settings";

export const APP_NAV: AppNavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Your learning home",
    icon: "dashboard",
  },
  {
    href: "/roadmaps",
    label: "Roadmaps",
    description: "Structured learning paths",
    icon: "roadmaps",
  },
  {
    href: "/courses",
    label: "Courses",
    description: "Modules and lessons",
    icon: "courses",
  },
  {
    href: "/resources",
    label: "Resources",
    description: "Curated external links",
    icon: "resources",
  },
  {
    href: "/projects",
    label: "Projects",
    description: "Build and showcase",
    icon: "projects",
  },
  {
    href: "/assessments",
    label: "Assessments",
    description: "Prove what you know",
    icon: "assessments",
  },
  {
    href: "/credentials",
    label: "Credentials",
    description: "Verifiable achievements",
    icon: "credentials",
  },
  {
    href: "/community",
    label: "Community",
    description: "Ask, share, grow",
    icon: "community",
  },
  {
    href: "/mentorship",
    label: "Mentorship",
    description: "Learn with experienced developers",
    icon: "mentorship",
  },
  {
    href: "/badges",
    label: "Badges",
    description: "Smaller achievements and streaks",
    icon: "badges",
  },
  {
    href: "/notifications",
    label: "Notifications",
    description: "Updates and replies",
    icon: "notifications",
  },
  {
    href: "/studio/courses",
    label: "Studio",
    description: "Create and manage your courses",
    icon: "studio",
  },
  {
    href: "/profile",
    label: "Profile",
    description: "Your public learning profile",
    icon: "profile",
  },
  {
    href: "/settings",
    label: "Settings",
    description: "Goals, preferences, and account",
    icon: "settings",
  },
];

export function navTitleForPath(pathname: string): string {
  const exact = APP_NAV.find((item) => item.href === pathname);
  if (exact) return exact.label;
  const nested = APP_NAV.find(
    (item) => item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`),
  );
  return nested?.label ?? "Coddle Learn";
}

export function NavIcon({
  id,
  className = "h-5 w-5",
}: {
  id: NavIconId;
  className?: string;
}): ReactNode {
  const common = {
    viewBox: "0 0 24 24",
    className,
    "aria-hidden": true as const,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (id) {
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="3.5" width="7" height="4.5" rx="1.5" />
          <rect x="13.5" y="11" width="7" height="9.5" rx="1.5" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "roadmaps":
      return (
        <svg {...common}>
          <path d="M7 4v7.5a2.5 2.5 0 0 0 2.5 2.5H14" />
          <circle cx="7" cy="4" r="2" />
          <circle cx="17" cy="14" r="2" />
          <path d="M17 16v4" />
          <circle cx="17" cy="20" r="1.5" />
        </svg>
      );
    case "courses":
      return (
        <svg {...common}>
          <path d="M4 7.5 12 4l8 3.5v8.5L12 20l-8-4V7.5Z" />
          <path d="M12 11.5 20 8" />
          <path d="M8.5 9.5v5.5" />
        </svg>
      );
    case "resources":
      return (
        <svg {...common}>
          <path d="M9.5 14.5a3.8 3.8 0 0 0 5.4.3l2-2a3.8 3.8 0 1 0-5.4-5.4l-1.1 1.1" />
          <path d="M14.5 9.5a3.8 3.8 0 0 0-5.4-.3l-2 2a3.8 3.8 0 1 0 5.4 5.4l1.1-1.1" />
        </svg>
      );
    case "projects":
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="13.5" rx="2" />
          <path d="M3.5 9.5h17" />
          <path d="M8 5V3.8a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1V5" />
        </svg>
      );
    case "assessments":
      return (
        <svg {...common}>
          <path d="M8 3.5h8a2 2 0 0 1 2 2v13l-3-1.8-3 1.8-3-1.8-3 1.8v-13a2 2 0 0 1 2-2Z" />
          <path d="M9 10.5h6M9 14h4" />
        </svg>
      );
    case "credentials":
      return (
        <svg {...common}>
          <circle cx="12" cy="9" r="5" />
          <path d="M9.5 13.2 8 20.5l4-2.4 4 2.4-1.5-7.3" />
        </svg>
      );
    case "community":
      return (
        <svg {...common}>
          <circle cx="8.5" cy="8.5" r="2.8" />
          <circle cx="16.5" cy="9.5" r="2.2" />
          <path d="M3.5 18.5c.8-2.8 2.8-4.2 5-4.2s4.2 1.4 5 4.2" />
          <path d="M14.2 14.5c1.6.2 3 1.1 3.8 3.5" />
        </svg>
      );
    case "mentorship":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="2.8" />
          <circle cx="16.5" cy="9" r="2.2" />
          <path d="M4 18.5c.8-2.8 2.7-4.2 5-4.2 1.4 0 2.6.5 3.5 1.4" />
          <path d="M14 15c1.5.1 2.9 1 3.7 3" />
          <path d="M12.5 12.5 14 14l3-3" />
        </svg>
      );
    case "badges":
      return (
        <svg {...common}>
          <path d="M12 3 14.4 8.2l5.6.5-4.3 3.6 1.4 5.5L12 15.2 6.9 17.8l1.4-5.5L4 8.7l5.6-.5L12 3Z" />
        </svg>
      );
    case "notifications":
      return (
        <svg {...common}>
          <path d="M7 9.2a5 5 0 0 1 10 0c0 3.8 1.5 5.3 1.5 5.3H5.5S7 13 7 9.2Z" />
          <path d="M10.2 18.2a1.8 1.8 0 0 0 3.6 0" />
        </svg>
      );
    case "profile":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5.2 19c1.1-3.2 3.3-4.8 6.8-4.8s5.7 1.6 6.8 4.8" />
        </svg>
      );
    case "studio":
      return (
        <svg {...common}>
          <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
          <path d="m13.5 6.5 4 4" />
          <path d="M14 20h6" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 3.2v2M12 18.8v2M3.2 12h2M18.8 12h2M5.8 5.8l1.4 1.4M16.8 16.8l1.4 1.4M18.2 5.8l-1.4 1.4M7.2 16.8l-1.4 1.4" />
        </svg>
      );
    default:
      return null;
  }
}
