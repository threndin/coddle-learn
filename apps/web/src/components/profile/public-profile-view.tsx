"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  COMMUNITY_KIND_LABELS,
  EXPERIENCE_LEVELS,
  type CommunityKind,
  type ExperienceLevel,
} from "@coddle/shared";
import { CredentialCertificate } from "@/components/credentials/credential-certificate";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";
import { SkillsGraph } from "@/components/skills/skills-graph";
import { Icon, type IconName } from "@/components/ui/icon";
import { useToast } from "@/components/app/toast";
import { errorMessage } from "@/lib/api-client";
import { communityPostPath } from "@/lib/community";
import { formatDate, pluralize, timeAgo } from "@/lib/format";
import {
  fetchPublicProfile,
  followProfile,
  unfollowProfile,
  type PublicProfileAchievement,
  type PublicProfilePayload,
  type PublicProfileProject,
} from "@/lib/profiles";

type SectionId = "activity" | "showcase" | "skills" | "proof";

const SECTIONS: { id: SectionId; label: string; hint: string }[] = [
  { id: "activity", label: "Activity", hint: "Paths & posts" },
  { id: "showcase", label: "Showcase", hint: "Projects built" },
  { id: "skills", label: "Skills", hint: "Evidence graph" },
  { id: "proof", label: "Proof", hint: "Credentials" },
];

function sectionsForProfile(profile: PublicProfilePayload["profile"]): typeof SECTIONS {
  if (profile.isOwn) return SECTIONS;
  const visibility = profile.visibility;
  if (!visibility) return SECTIONS;
  return SECTIONS.filter((item) => {
    if (item.id === "activity") return visibility.roadmaps || visibility.posts;
    if (item.id === "showcase") return visibility.projects;
    if (item.id === "skills") return visibility.skills;
    if (item.id === "proof") return visibility.credentials || visibility.achievements;
    return true;
  });
}

const STATUS_LABEL: Record<string, string> = {
  credentialed: "Completed",
  demonstrated: "Demonstrated",
  learning: "Learning",
  interested: "Interested",
};

const STATUS_TONE: Record<string, string> = {
  credentialed: "bg-emerald-50 text-emerald-800 ring-emerald-200/80 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
  demonstrated: "bg-sky-50 text-sky-800 ring-sky-200/80 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30",
  learning: "bg-amber-50 text-amber-900 ring-amber-200/80 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
  interested: "bg-surface-subtle text-ink-muted ring-border",
};

const STATUS_DOT: Record<string, string> = {
  credentialed: "bg-emerald-500",
  demonstrated: "bg-sky-500",
  learning: "bg-amber-500",
  interested: "bg-ink-muted",
};

const ACHIEVEMENT_THEME: Record<string, { from: string; to: string; accent: string }> = {
  "first-course": { from: "#004CC8", to: "#003A9E", accent: "#5B9BFF" },
  "first-project": { from: "#0F766E", to: "#115E59", accent: "#2DD4BF" },
  "streak-7": { from: "#C2410C", to: "#9A3412", accent: "#FB923C" },
  "open-source-contributor": { from: "#15803D", to: "#166534", accent: "#4ADE80" },
  "roadmap-completed": { from: "#1E3A5F", to: "#0F2744", accent: "#7DD3FC" },
  mentor: { from: "#BE185D", to: "#9D174D", accent: "#F9A8D4" },
  "course-creator": { from: "#B45309", to: "#92400E", accent: "#FBBF24" },
  "resource-reviewer": { from: "#0E7490", to: "#155E75", accent: "#67E8F9" },
};

function levelLabel(level: ExperienceLevel | string | null) {
  if (!level) return null;
  return EXPERIENCE_LEVELS.find((item) => item.id === level)?.label ?? level;
}

function kindLabel(kind: string) {
  return kind in COMMUNITY_KIND_LABELS
    ? COMMUNITY_KIND_LABELS[kind as CommunityKind]
    : kind;
}

function memberSinceLabel(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return formatDate(iso);
  }
}

export function PublicProfileView({
  username,
  initial,
}: {
  username: string;
  initial: PublicProfilePayload | null;
}) {
  const { pushToast } = useToast();
  const [data, setData] = useState(initial);
  const [section, setSection] = useState<SectionId>("activity");
  const [loading, setLoading] = useState(initial === null);
  const [error, setError] = useState<string | null>(
    initial ? null : "Could not load this profile",
  );
  const [followPending, startFollowTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initial !== null) {
      setData(initial);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const next = await fetchPublicProfile(username);
        if (cancelled) return;
        setData(next);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, "Could not load this profile"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username, initial]);

  async function toggleFollow() {
    if (!data || data.profile.isOwn) return;
    const { profile } = data;
    startFollowTransition(async () => {
      try {
        const result = profile.isFollowing
          ? await unfollowProfile(profile.username)
          : await followProfile(profile.username);
        setData((prev) =>
          prev
            ? {
                ...prev,
                profile: {
                  ...prev.profile,
                  isFollowing: result.isFollowing,
                  followerCount: result.followerCount,
                },
              }
            : prev,
        );
      } catch (err) {
        pushToast(errorMessage(err, "Could not update follow"), "error");
      }
    });
  }

  async function copyProfileLink() {
    if (!data) return;
    const url = `${window.location.origin}/u/${encodeURIComponent(data.profile.username)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      pushToast("Profile link copied", "success");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      pushToast("Could not copy link", "error");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-6xl items-center justify-center px-5">
        <p className="text-sm text-ink-muted">Loading profile…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto w-full max-w-lg px-5 py-20 text-center sm:px-8">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-brand">
          Profile
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">
          Profile not found
        </h1>
        <p className="mt-3 text-base text-ink-muted">
          {error ?? "This learner does not have a public profile yet."}
        </p>
        <Link
          href="/community"
          className="mt-8 inline-flex rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Browse community
        </Link>
      </div>
    );
  }

  const { profile, skillGraph, credentials, achievements, projects, roadmaps, posts } =
    data;
  const level = levelLabel(profile.experienceLevel);
  const featured = projects[0] ?? null;
  const restProjects = projects.slice(1);
  const visibleSections = sectionsForProfile(profile);
  const activeSection =
    visibleSections.find((item) => item.id === section)?.id ??
    visibleSections[0]?.id ??
    "activity";

  return (
    <div className="min-h-full bg-surface-subtle">
      {/* ── Hero: identity as the brand signal ── */}
      <header className="relative overflow-hidden border-b border-border bg-surface">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute inset-0 grid-bg opacity-60" />
          <div className="absolute inset-0 brand-glow" />
          <div className="absolute -left-32 top-0 h-[28rem] w-[28rem] rounded-full bg-brand/10 blur-3xl" />
          <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-brand-light/20 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surface to-transparent" />
        </div>

        <div className="relative mx-auto w-full max-w-6xl px-5 pb-10 pt-10 sm:px-8 sm:pb-12 sm:pt-12">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 flex-col gap-6 sm:flex-row sm:items-end">
              <div className="profile-avatar-enter relative shrink-0">
                <div
                  className="absolute -inset-2 rounded-full bg-gradient-to-br from-brand/30 via-brand-light/20 to-transparent blur-md"
                  aria-hidden
                />
                <ProfileAvatar
                  name={profile.name}
                  avatarUrl={profile.avatarUrl}
                  size="xl"
                />
              </div>

              <div className="min-w-0 profile-copy-enter">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">
                  {profile.isOwn ? "Your public profile" : "Learner showcase"}
                </p>
                <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                  {profile.name}
                </h1>
                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
                  <span className="font-mono text-ink">@{profile.username}</span>
                  {level ? (
                    <>
                      <span className="text-border" aria-hidden>
                        ·
                      </span>
                      <span>{level}</span>
                    </>
                  ) : null}
                  <span className="text-border" aria-hidden>
                    ·
                  </span>
                  <span>Joined {memberSinceLabel(profile.memberSince)}</span>
                </p>
                {profile.mentorship ? (
                  <Link
                    href={`/mentors/${encodeURIComponent(profile.username)}`}
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand transition hover:bg-brand hover:text-white"
                  >
                    <Icon name="users" className="h-3.5 w-3.5" />
                    Mentoring · {profile.mentorship.headline}
                  </Link>
                ) : null}
                {profile.bio ? (
                  <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink/90">
                    {profile.bio}
                  </p>
                ) : (
                  <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-muted">
                    {profile.isOwn
                      ? "Add a bio so visitors know what you’re building toward."
                      : "Building skills on Coddle Learn."}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 profile-actions-enter lg:pb-1">
              <button
                type="button"
                onClick={() => void copyProfileLink()}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface/80 px-4 py-2.5 text-sm font-semibold text-ink backdrop-blur transition hover:border-border-strong hover:bg-surface"
              >
                <Icon name="link" className="h-4 w-4" />
                {copied ? "Copied" : "Share"}
              </button>
              {profile.isOwn ? (
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition hover:brightness-110"
                >
                  <Icon name="pencil" className="h-4 w-4" />
                  Edit profile
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={followPending}
                  onClick={() => void toggleFollow()}
                  className={[
                    "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60",
                    profile.isFollowing
                      ? "border border-border bg-surface/80 text-ink backdrop-blur hover:bg-surface"
                      : "bg-brand text-white shadow-lg shadow-brand/25 hover:brightness-110",
                  ].join(" ")}
                >
                  <Icon
                    name={profile.isFollowing ? "checkCircle" : "users"}
                    className="h-4 w-4"
                  />
                  {followPending
                    ? "Saving…"
                    : profile.isFollowing
                      ? "Following"
                      : "Follow"}
                </button>
              )}
            </div>
          </div>

          {/* Metric ribbon — typographic, not a card grid */}
          <dl className="profile-metrics-enter mt-10 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-6">
            <Metric label="Points" value={profile.points.toLocaleString()} />
            <Metric label="Followers" value={profile.followerCount.toLocaleString()} />
            <Metric label="Following" value={profile.followingCount.toLocaleString()} />
            <Metric label="Projects" value={String(profile.stats.projects)} />
            <Metric label="Credentials" value={String(profile.stats.credentials)} />
            <Metric
              label="Skills"
              value={String(profile.stats.demonstratedSkills)}
            />
          </dl>
        </div>
      </header>

      {/* ── Body: rail + stage ── */}
      <div className="mx-auto grid w-full max-w-6xl gap-0 px-5 py-8 sm:px-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10 lg:py-8">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <nav
            aria-label="Profile sections"
            className="flex gap-1 overflow-x-auto pb-3 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0"
          >
            {visibleSections.map((item) => {
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={[
                    "group flex shrink-0 flex-col rounded-xl px-3.5 py-2.5 text-left transition lg:w-full",
                    active
                      ? "bg-surface text-ink shadow-sm ring-1 ring-border"
                      : "text-ink-muted hover:bg-surface/70 hover:text-ink",
                  ].join(" ")}
                >
                  <span className="text-sm font-semibold">{item.label}</span>
                  <span
                    className={[
                      "hidden text-xs lg:block",
                      active ? "text-ink-muted" : "text-ink-muted/70",
                    ].join(" ")}
                  >
                    {item.hint}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0">
          {visibleSections.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center text-sm text-ink-muted">
              This learner has not shared activity sections yet.
            </p>
          ) : null}
          {activeSection === "activity" ? (
            <ActivityStage
              showRoadmaps={profile.isOwn || profile.visibility?.roadmaps !== false}
              showPosts={profile.isOwn || profile.visibility?.posts !== false}
              posts={posts}
              roadmaps={roadmaps}
            />
          ) : null}
          {activeSection === "showcase" ? (
            <ShowcaseStage
              featured={featured}
              projects={restProjects}
              isOwn={profile.isOwn}
              onBrowseSkills={() => setSection("skills")}
            />
          ) : null}
          {activeSection === "skills" ? (
            <SkillsStage
              skillGraph={skillGraph}
              interests={profile.skills}
              highlighted={profile.highlightedSkills}
              isOwn={profile.isOwn}
            />
          ) : null}
          {activeSection === "proof" ? (
            <ProofStage
              earnerName={profile.name}
              showCredentials={
                profile.isOwn || profile.visibility?.credentials !== false
              }
              showAchievements={
                profile.isOwn || profile.visibility?.achievements !== false
              }
              credentials={credentials}
              achievements={achievements}
              catalogSize={data.achievementCatalogSize}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-4 py-3.5 sm:px-5 sm:py-4">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </dt>
      <dd className="mt-1 font-display text-2xl font-bold tracking-tight text-ink tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function StageEyebrow({ children }: { children: string }) {
  return (
    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
      {children}
    </p>
  );
}

function StageTitle({
  children,
  aside,
}: {
  children: string;
  aside?: string;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
      <h2 className="font-display text-lg font-bold tracking-tight text-ink sm:text-xl">
        {children}
      </h2>
      {aside ? <p className="pb-0.5 text-sm text-ink-muted">{aside}</p> : null}
    </div>
  );
}

function ShowcaseStage({
  featured,
  projects,
  isOwn,
  onBrowseSkills,
}: {
  featured: PublicProfileProject | null;
  projects: PublicProfileProject[];
  isOwn: boolean;
  onBrowseSkills: () => void;
}) {
  if (!featured) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-surface px-6 py-16 text-center sm:px-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Icon name="layers" className="h-6 w-6" />
        </div>
        <h2 className="mt-5 font-display text-2xl font-bold tracking-tight text-ink">
          Showcase coming soon
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
          {isOwn
            ? "Submit a project and it becomes the centerpiece of your public profile."
            : "This learner has not published a project yet."}
        </p>
        {isOwn ? (
          <Link
            href="/projects"
            className="mt-6 inline-flex rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Browse projects
          </Link>
        ) : (
          <button
            type="button"
            onClick={onBrowseSkills}
            className="mt-6 inline-flex text-sm font-semibold text-brand transition hover:underline"
          >
            View their skills instead
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <StageEyebrow>Featured work</StageEyebrow>
        <StageTitle aside={featured.project.path.label}>
          {featured.project.title}
        </StageTitle>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-muted">
          {featured.project.summary}
        </p>
      </div>

      <FeaturedProjectMedia item={featured} />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link
          href={`/projects/${encodeURIComponent(featured.project.slug)}`}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition hover:brightness-110"
        >
          View project
          <Icon name="chevronRight" className="h-4 w-4" />
        </Link>
        {featured.liveUrl ? (
          <a
            href={featured.liveUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-ink transition hover:text-brand"
          >
            <Icon name="external" className="h-4 w-4" />
            Live demo
          </a>
        ) : null}
        {featured.repoUrl ? (
          <a
            href={featured.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-ink transition hover:text-brand"
          >
            <Icon name="code" className="h-4 w-4" />
            Repository
          </a>
        ) : null}
        {featured.submittedAt ? (
          <span className="text-sm text-ink-muted">
            Submitted {formatDate(featured.submittedAt)}
          </span>
        ) : null}
      </div>

      {projects.length > 0 ? (
        <section className="pt-4">
          <StageEyebrow>More builds</StageEyebrow>
          <ul className="mt-5 divide-y divide-border border-y border-border">
            {projects.map((item) => (
              <li key={item.id}>
                <ProjectRow item={item} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function FeaturedProjectMedia({ item }: { item: PublicProfileProject }) {
  const src = item.project.exampleImageUrl;
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-border bg-brand-navy shadow-2xl shadow-brand-navy/20">
      {src ? (
        // Project example art may be remote or seeded static paths.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="aspect-[16/9] w-full object-cover transition duration-700 group-hover:scale-[1.02]"
        />
      ) : (
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          <div
            className="absolute inset-0 opacity-90"
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 30% 40%, rgb(0 76 200 / 0.55), transparent 60%), radial-gradient(ellipse 50% 50% at 80% 20%, rgb(91 155 255 / 0.35), transparent 55%), linear-gradient(160deg, #061833 0%, #0a2748 50%, #061833 100%)",
            }}
          />
          <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgb(255_255_255)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
            <Icon name="layers" className="h-10 w-10 text-white/70" />
            <p className="mt-4 font-display text-xl font-bold text-white sm:text-2xl">
              {item.project.title}
            </p>
            <p className="mt-2 max-w-md text-sm text-white/60">{item.project.path.label}</p>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-brand-navy/80 to-transparent" />
    </div>
  );
}

function ProjectRow({ item }: { item: PublicProfileProject }) {
  return (
    <article className="flex flex-wrap items-start justify-between gap-4 py-5 transition">
      <div className="min-w-0 flex-1">
        <Link
          href={`/projects/${encodeURIComponent(item.project.slug)}`}
          className="font-display text-lg font-bold tracking-tight text-ink transition hover:text-brand"
        >
          {item.project.title}
        </Link>
        <p className="mt-1.5 line-clamp-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
          {item.project.summary}
        </p>
        <p className="mt-2 text-xs text-ink-muted">
          {item.project.path.label}
          {item.submittedAt ? (
            <>
              <span className="mx-1.5 text-border" aria-hidden>
                ·
              </span>
              {formatDate(item.submittedAt)}
            </>
          ) : null}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-4 text-xs font-semibold">
        {item.liveUrl ? (
          <a
            href={item.liveUrl}
            target="_blank"
            rel="noreferrer"
            className="text-brand transition hover:underline"
          >
            Live
          </a>
        ) : null}
        {item.repoUrl ? (
          <a
            href={item.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-ink-muted transition hover:text-brand"
          >
            Repo
          </a>
        ) : null}
      </div>
    </article>
  );
}

function SkillsStage({
  skillGraph,
  interests,
  highlighted,
  isOwn,
}: {
  skillGraph: PublicProfilePayload["skillGraph"];
  interests: PublicProfilePayload["profile"]["skills"];
  highlighted: PublicProfilePayload["profile"]["highlightedSkills"];
  isOwn: boolean;
}) {
  return (
    <div className="space-y-10">
      <div>
        <StageEyebrow>Evidence graph</StageEyebrow>
        <StageTitle
          aside={
            skillGraph.demonstratedCount > 0
              ? `${skillGraph.demonstratedCount} demonstrated`
              : undefined
          }
        >
          Skills with proof
        </StageTitle>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
          Relationships built from assessments, projects, and credentials — enrollment alone
          does not light a node.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-xl shadow-ink/5">
        <div className="border-b border-border bg-surface-subtle/80 px-5 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-4 text-xs text-ink-muted">
            <span>
              <span className="font-semibold tabular-nums text-ink">
                {skillGraph.demonstratedCount}
              </span>{" "}
              proven
            </span>
            <span className="text-border" aria-hidden>
              ·
            </span>
            <span>
              <span className="font-semibold tabular-nums text-ink">
                {skillGraph.learningCount}
              </span>{" "}
              learning
            </span>
            <span className="text-border" aria-hidden>
              ·
            </span>
            <span>
              <span className="font-semibold tabular-nums text-ink">
                {skillGraph.interestedCount}
              </span>{" "}
              interested
            </span>
          </div>
        </div>
        <div className="p-2 sm:p-4">
          <SkillsGraph graph={skillGraph} compact />
        </div>
      </div>

      {highlighted.length > 0 ? (
        <section>
          <StageEyebrow>Active skills</StageEyebrow>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {highlighted.map((skill) => {
              const status = skill.status ?? "interested";
              return (
                <li key={skill.slug} className="h-full">
                  <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-4 shadow-sm shadow-ink/[0.03] transition hover:border-border-strong">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display text-base font-bold tracking-tight text-ink">
                          {skill.name}
                        </p>
                        {skill.category ? (
                          <p className="mt-1 text-xs text-ink-muted">{skill.category}</p>
                        ) : null}
                      </div>
                      <span
                        className={[
                          "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
                          STATUS_TONE[status] ?? STATUS_TONE.interested,
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "h-1.5 w-1.5 rounded-full",
                            STATUS_DOT[status] ?? STATUS_DOT.interested,
                          ].join(" ")}
                          aria-hidden
                        />
                        {STATUS_LABEL[status] ?? status}
                      </span>
                    </div>
                    <div className="mt-auto pt-4">
                      <div className="h-1 overflow-hidden rounded-full bg-surface-subtle">
                        <div
                          className={[
                            "h-full rounded-full transition-[width]",
                            status === "credentialed"
                              ? "w-full bg-emerald-500"
                              : status === "demonstrated"
                                ? "w-4/5 bg-sky-500"
                                : status === "learning"
                                  ? "w-2/5 bg-amber-500"
                                  : "w-1/5 bg-border-strong",
                          ].join(" ")}
                        />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {interests.length > 0 ? (
        <section>
          <StageEyebrow>Interests</StageEyebrow>
          <ul className="mt-4 flex flex-wrap gap-2">
            {interests.map((skill) => (
              <li
                key={skill.slug}
                className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm font-medium text-ink"
              >
                {skill.name}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function ProofStage({
  earnerName,
  credentials,
  achievements,
  catalogSize,
  showCredentials = true,
  showAchievements = true,
}: {
  earnerName: string;
  credentials: PublicProfilePayload["credentials"];
  achievements: PublicProfileAchievement[];
  catalogSize: number;
  showCredentials?: boolean;
  showAchievements?: boolean;
}) {
  return (
    <div className="space-y-10">
      {showCredentials ? (
        <section>
          <StageEyebrow>Verified</StageEyebrow>
          <StageTitle
            aside={
              credentials.length > 0
                ? pluralize(credentials.length, "credential")
                : undefined
            }
          >
            Credentials
          </StageTitle>

          {credentials.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">No credentials earned yet.</p>
          ) : (
            <ul className="mt-5 grid gap-4 sm:grid-cols-2">
              {credentials.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/credentials/${encodeURIComponent(item.id)}`}
                    className="group block overflow-hidden rounded-2xl border border-border bg-surface-subtle p-2.5 transition hover:border-brand/40"
                  >
                    <CredentialCertificate
                      compact
                      data={{
                        earnerName,
                        title: item.title,
                        kind: item.kind,
                        issuedAt: item.issuedAt,
                        code: item.code,
                        verifyUrl: item.verifyUrl,
                        assessmentTitle: item.source.assessmentTitle,
                        courseTitle: item.source.courseTitle,
                        projectTitle: item.source.projectTitle,
                        pathLabel: item.source.pathLabel,
                      }}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {showAchievements ? (
        <section>
          <StageEyebrow>Milestones</StageEyebrow>
          <StageTitle aside={`${achievements.length} of ${catalogSize}`}>
            Achievements
          </StageTitle>

          {achievements.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">No achievements unlocked yet.</p>
          ) : (
            <ul className="mt-5 flex flex-wrap gap-6 sm:gap-8">
              {achievements.map((item) => (
                <li key={item.slug} className="w-[5.5rem] text-center sm:w-24">
                  <AchievementMedallion item={item} />
                  <Link
                    href={`/achievements/${encodeURIComponent(item.slug)}`}
                    className="mt-3 block text-xs font-semibold leading-snug text-ink transition hover:text-brand"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}

function AchievementMedallion({ item }: { item: PublicProfileAchievement }) {
  const theme = ACHIEVEMENT_THEME[item.slug] ?? {
    from: "#334155",
    to: "#1E293B",
    accent: "#94A3B8",
  };
  const icon = (["book", "layers", "sparkle", "code", "target", "users", "star"].includes(
    item.icon,
  )
    ? item.icon
    : "star") as IconName;

  return (
    <div className="relative mx-auto h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]">
      <div
        className="absolute inset-0 rounded-full opacity-70 blur-md"
        style={{
          background: `radial-gradient(circle at 40% 30%, ${theme.accent}66, transparent 65%)`,
        }}
      />
      <div
        className="relative flex h-full w-full items-center justify-center rounded-full text-white shadow-lg"
        style={{
          background: `linear-gradient(145deg, ${theme.from}, ${theme.to})`,
          boxShadow: `0 8px 24px ${theme.from}44`,
        }}
      >
        <Icon name={icon} className="h-6 w-6 sm:h-7 sm:w-7" />
      </div>
    </div>
  );
}

function postImageUrl(item: PublicProfilePayload["posts"][number]): string | null {
  const fromList = item.imageUrls?.find((url) => typeof url === "string" && url.length > 0);
  if (fromList) return fromList;
  if (item.imageUrl && item.imageUrl.length > 0) return item.imageUrl;
  return null;
}

function PostThumb({ imageUrl }: { imageUrl: string }) {
  return (
    <span className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-surface-subtle ring-1 ring-border sm:h-28 sm:w-28">
      {/* Community post media may be R2 or seeded static paths. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="" className="h-full w-full object-cover" />
    </span>
  );
}

function ActivityStage({
  posts,
  roadmaps,
  showRoadmaps = true,
  showPosts = true,
}: {
  posts: PublicProfilePayload["posts"];
  roadmaps: PublicProfilePayload["roadmaps"];
  showRoadmaps?: boolean;
  showPosts?: boolean;
}) {
  return (
    <div className="space-y-12">
      {showRoadmaps ? (
        <section>
          <StageTitle
            aside={roadmaps.length > 0 ? pluralize(roadmaps.length, "roadmap") : undefined}
          >
            Roadmaps
          </StageTitle>

          {roadmaps.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">Not enrolled in a roadmap yet.</p>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {roadmaps.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/roadmaps/${encodeURIComponent(item.slug)}`}
                    className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-4 shadow-sm shadow-ink/[0.03] transition hover:border-border-strong sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display text-base font-bold tracking-tight text-ink transition group-hover:text-brand">
                          {item.name}
                        </p>
                        <p className="mt-1 text-xs text-ink-muted">
                          {item.completedAt
                            ? `Completed ${formatDate(item.completedAt)}`
                            : `Started ${formatDate(item.startedAt)}`}
                          {item.isPrimary ? " · Primary" : null}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 font-mono text-xs font-semibold tabular-nums text-brand">
                        {item.progressPercent}%
                      </span>
                    </div>
                    <div className="mt-auto pt-4">
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-subtle">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand to-brand-light transition-[width] duration-700"
                          style={{
                            width: `${Math.min(100, Math.max(0, item.progressPercent))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {showPosts ? (
        <section>
          <StageEyebrow>Community</StageEyebrow>
          <StageTitle
            aside={posts.length > 0 ? pluralize(posts.length, "post") : undefined}
          >
            Recent posts
          </StageTitle>

          {posts.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">No community posts yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {posts.map((item) => {
                const imageUrl = postImageUrl(item);
                return (
                  <li key={item.id} className="py-5">
                    <Link
                      href={communityPostPath(item)}
                      className="group flex items-center gap-5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-ink-muted">
                          {kindLabel(item.kind)}
                          <span className="mx-1.5 text-border" aria-hidden>
                            ·
                          </span>
                          {timeAgo(item.createdAt)}
                          <span className="mx-1.5 text-border" aria-hidden>
                            ·
                          </span>
                          {pluralize(item.commentCount, "comment")}
                        </p>
                        <p className="mt-1.5 font-display text-lg font-bold tracking-tight text-ink transition group-hover:text-brand">
                          {item.title}
                        </p>
                        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-muted">
                          {item.body}
                        </p>
                      </div>
                      {imageUrl ? <PostThumb imageUrl={imageUrl} /> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
