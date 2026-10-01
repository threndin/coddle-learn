import Image from "next/image";
import Link from "next/link";
import { APP_TAGLINE, GITHUB_URL } from "@coddle/shared";

const columns = [
  {
    title: "Product",
    links: [
      { href: "#loop", label: "How it works" },
      { href: "#platform", label: "Platform" },
      { href: "#paths", label: "Paths" },
      { href: "#opensource", label: "Open source" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "#paths", label: "Roadmaps" },
      { href: "#platform", label: "Courses" },
      { href: "#platform", label: "Projects" },
      { href: "#platform", label: "Credentials" },
    ],
  },
  {
    title: "Community",
    links: [
      { href: "#opensource", label: "Contribute" },
      { href: "#opensource", label: "Mentors" },
      ...(GITHUB_URL ? [{ href: GITHUB_URL, label: "GitHub" }] : []),
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-subtle px-5 py-14 sm:px-8">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Image
            src="/logo.png"
            alt="Coddle Learn"
            width={160}
            height={38}
            className="h-8 w-auto"
          />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-muted">
            {APP_TAGLINE} Open-source learning infrastructure for developers.
          </p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <p className="text-sm font-semibold text-ink">{column.title}</p>
            <ul className="mt-4 space-y-2">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-ink-muted transition-colors hover:text-brand"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-12 max-w-6xl border-t border-border pt-6 text-xs text-ink-muted">
        © {new Date().getFullYear()} Coddle Learn · Part of the Coddle family
      </div>
    </footer>
  );
}
