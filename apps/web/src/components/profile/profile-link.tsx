"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { profilePath } from "@/lib/profiles";

type ProfileRef = {
  username?: string | null;
  id?: string;
};

/** Links to a public profile when a username (or id fallback) is available. */
export function ProfileLink({
  user,
  className,
  children,
  onClick,
}: {
  user: ProfileRef;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  const key = user.username || user.id;
  if (!key) {
    return <span className={className}>{children}</span>;
  }

  return (
    <Link href={profilePath(key)} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
