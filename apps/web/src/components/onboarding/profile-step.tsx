import { BIO_MAX, EXPERIENCE_LEVELS, type ExperienceLevel } from "@coddle/shared";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";

export function ProfileStep({
  name,
  email,
  avatarUrl,
  bio,
  experienceLevel,
  onBio,
  onLevel,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  bio: string;
  experienceLevel: ExperienceLevel | null;
  onBio: (bio: string) => void;
  onLevel: (level: ExperienceLevel) => void;
}) {
  const level = EXPERIENCE_LEVELS.find((item) => item.id === experienceLevel) ?? null;

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="order-2 lg:order-1">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          Profile
        </p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          This is your learning profile
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-muted">
          Name, email, and photo come from your Coddle account. Add a short bio and
          choose the level that fits where you are starting.
        </p>

        <label className="mt-8 block">
          <span className="text-sm font-semibold text-ink">Bio</span>
          <textarea
            value={bio}
            onChange={(event) => onBio(event.target.value)}
            maxLength={BIO_MAX}
            rows={4}
            placeholder="I want to learn frontend development and ship a small app."
            className="mt-2 w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-ink outline-none ring-brand/20 placeholder:text-ink-muted focus:border-brand focus:ring-4"
          />
          <span className="mt-2 block text-right text-xs text-ink-muted">
            {bio.length}/{BIO_MAX}
          </span>
        </label>

        <fieldset className="mt-6">
          <legend className="text-sm font-semibold text-ink">Where are you starting?</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Experience level">
            {EXPERIENCE_LEVELS.map((item) => {
              const selected = item.id === experienceLevel;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onLevel(item.id)}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    selected
                      ? "border-brand bg-brand-soft ring-2 ring-brand"
                      : "border-border bg-surface hover:border-brand/40"
                  }`}
                >
                  <span className="block text-sm font-semibold text-ink">{item.label}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-ink-muted">
                    {item.description}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      <aside className="order-1 rounded-2xl border border-border bg-surface p-6 shadow-sm lg:sticky lg:top-28 lg:order-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
          Preview
        </p>
        <div className="mt-4 flex items-center gap-3">
          <ProfileAvatar name={name} avatarUrl={avatarUrl} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{name}</p>
            <p className="truncate text-sm text-ink-muted">{email}</p>
          </div>
        </div>
        <p className="mt-5 text-sm leading-relaxed text-ink">
          {bio.trim() ? bio : <span className="text-ink-muted">Your bio will show here.</span>}
        </p>
        <p className="mt-4 inline-flex rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
          {level ? level.label : "Level not chosen"}
        </p>
      </aside>
    </div>
  );
}
