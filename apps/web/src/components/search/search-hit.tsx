"use client";

import { useState } from "react";
import Link from "next/link";
import {
  SEARCH_TYPE_SINGULAR,
  type SearchHit,
  type SearchType,
} from "@coddle/shared";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";
import { Icon, type IconName } from "@/components/ui/icon";

const TYPE_ICONS: Record<SearchType, IconName> = {
  course: "book",
  roadmap: "layers",
  resource: "link",
  project: "file",
  developer: "users",
  mentor: "users",
  skill: "sparkle",
  tool: "code",
};

function typeIcon(type: SearchType): IconName {
  return TYPE_ICONS[type] ?? "search";
}

function HitThumb({ hit }: { hit: SearchHit }) {
  const [failed, setFailed] = useState(false);
  const person = hit.type === "developer" || hit.type === "mentor";

  if (person) {
    return <ProfileAvatar name={hit.title} avatarUrl={hit.imageUrl} size="md" />;
  }

  if (hit.imageUrl && !failed) {
    return (
      // Catalog thumbs, favicons, and tool art come from many hosts.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={hit.imageUrl}
        alt=""
        onError={() => setFailed(true)}
        className="h-12 w-12 shrink-0 rounded-xl bg-surface-subtle object-cover"
      />
    );
  }

  return (
    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
      <Icon name={typeIcon(hit.type)} className="h-5 w-5" />
    </span>
  );
}

export function SearchHitCard({ hit }: { hit: SearchHit }) {
  const external = hit.href.startsWith("http");
  const className =
    "flex gap-3 rounded-2xl border border-border bg-surface p-3.5 transition hover:border-border-strong hover:bg-surface-subtle";

  const inner = (
    <>
      <HitThumb hit={hit} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate font-semibold text-ink">{hit.title}</span>
          <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
            {SEARCH_TYPE_SINGULAR[hit.type]}
          </span>
          {external ? <Icon name="external" className="h-3.5 w-3.5 text-ink-muted" /> : null}
        </span>
        {hit.subtitle ? (
          <span className="mt-0.5 block truncate text-xs text-ink-muted">{hit.subtitle}</span>
        ) : null}
        {hit.snippet ? (
          <span className="mt-1 block text-sm leading-relaxed text-ink-muted">{hit.snippet}</span>
        ) : null}
        {hit.skills.length > 0 ? (
          <span className="mt-2 flex flex-wrap gap-1.5">
            {hit.skills.slice(0, 4).map((skill) => (
              <span
                key={skill.slug}
                className="rounded-lg bg-surface-subtle px-1.5 py-0.5 text-[11px] font-medium text-ink-muted"
              >
                {skill.name}
              </span>
            ))}
          </span>
        ) : null}
      </span>
    </>
  );

  if (external) {
    return (
      <a href={hit.href} target="_blank" rel="noreferrer" className={className}>
        {inner}
      </a>
    );
  }

  return (
    <Link href={hit.href} className={className}>
      {inner}
    </Link>
  );
}
