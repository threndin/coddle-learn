import Image from "next/image";
import Link from "next/link";
import { HeaderAuth } from "@/components/landing/header-auth";

const nav = [
  { href: "#loop", label: "How it works" },
  { href: "#platform", label: "Platform" },
  { href: "#paths", label: "Paths" },
  { href: "#opensource", label: "Open source" },
];

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center">
          <Image
            src="/logo.png"
            alt="Coddle Learn"
            width={168}
            height={40}
            className="h-10 w-auto brightness-0 invert sm:h-10"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-white/60 transition-colors hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <HeaderAuth />
      </div>
    </header>
  );
}
