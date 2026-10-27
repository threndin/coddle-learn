"use client";

import Link from "next/link";
import { canReviewContent } from "@coddle/shared";
import { useAppUser } from "@/components/app/app-user-context";
import { Icon } from "@/components/ui/icon";

export function StudioReviewersCard() {
  const user = useAppUser();
  if (!canReviewContent(user.role)) return null;

  return (
    <Link
      href="/reviewers"
      className="group rounded-2xl border border-border bg-surface p-6 transition hover:border-brand/40"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
        <Icon name="checkCircle" className="h-5 w-5" />
      </span>
      <h2 className="mt-4 font-display text-xl font-bold text-ink group-hover:text-brand">
        Reviewers
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        Approve, request changes, or flag courses, projects, resources, and tools.
      </p>
    </Link>
  );
}
