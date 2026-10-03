import {
  formatMinutes,
  levelById,
  practiceDaysLabel,
  roadmapBySlug,
  weeklyPracticeLabel,
  type ExperienceLevel,
  type PracticeDay,
} from "@coddle/shared";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";

function EditButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className="shrink-0 text-sm font-semibold text-brand hover:underline">
      Edit<span className="sr-only"> {label}</span>
    </button>
  );
}

export function ReviewStep({
  name,
  email,
  avatarUrl,
  bio,
  experienceLevel,
  skills,
  roadmapSlug,
  minutes,
  days,
  onEdit,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  bio: string;
  experienceLevel: ExperienceLevel | null;
  skills: { slug: string; name: string }[];
  roadmapSlug: string | null;
  minutes: number;
  days: PracticeDay[];
  onEdit: (step: number) => void;
}) {
  const level = experienceLevel ? levelById(experienceLevel) : null;
  const roadmap = roadmapSlug ? roadmapBySlug(roadmapSlug) : null;

  return (
    <div>
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
        Review
      </p>
      <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        You&apos;re ready to start
      </h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-muted">
        This is the plan your dashboard will open with. Change anything before you begin.
      </p>

      <div className="mt-8 space-y-3">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <ProfileAvatar name={name} avatarUrl={avatarUrl} />
              <div className="min-w-0">
                <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  Profile
                </h2>
                <p className="mt-1 truncate font-semibold text-ink">{name}</p>
                <p className="truncate text-sm text-ink-muted">{email}</p>
              </div>
            </div>
            <EditButton onClick={() => onEdit(0)} label="profile" />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink">
            {bio.trim() ? bio : <span className="text-ink-muted">No bio yet.</span>}
          </p>
          <p className="mt-3 inline-flex rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
            {level?.label ?? "Level not chosen"}
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Skills
            </h2>
            <EditButton onClick={() => onEdit(1)} label="skills" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill.slug}
                className="rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-ink"
              >
                {skill.name}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Roadmap
            </h2>
            <EditButton onClick={() => onEdit(2)} label="roadmap" />
          </div>
          <p className="mt-3 font-semibold text-ink">{roadmap?.name ?? "Choose a roadmap"}</p>
          {roadmap ? (
            <p className="mt-1 text-sm text-ink-muted">{roadmap.summary}</p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Daily goal
            </h2>
            <EditButton onClick={() => onEdit(3)} label="daily goal" />
          </div>
          <p className="mt-3 font-semibold text-ink">{formatMinutes(minutes)} a day</p>
          <p className="mt-1 text-sm text-ink-muted">
            {practiceDaysLabel(days)} · {weeklyPracticeLabel(minutes, days.length)}
          </p>
        </section>
      </div>
    </div>
  );
}
