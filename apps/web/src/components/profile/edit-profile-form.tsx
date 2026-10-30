"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  DEFAULT_PROFILE_VISIBILITY,
  PROFILE_VISIBILITY_OPTIONS,
  type ExperienceLevel,
  type ProfileVisibility,
  profilePath,
} from "@coddle/shared";
import { useToast } from "@/components/app/toast";
import { useAppUser, useAppUserActions } from "@/components/app/app-user-context";
import { ProfileStep } from "@/components/onboarding/profile-step";
import { SkillsStep } from "@/components/onboarding/skills-step";
import { Icon } from "@/components/ui/icon";
import { errorMessage } from "@/lib/api-client";
import { updateProfile } from "@/lib/auth";

type SkillChoice = { slug: string; name: string };

export function EditProfileForm({ embedded = false }: { embedded?: boolean }) {
  const user = useAppUser();
  const { patchUser } = useAppUserActions();
  const { pushToast } = useToast();
  const [pending, startTransition] = useTransition();

  const [bio, setBio] = useState(user.bio ?? "");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(
    user.experienceLevel,
  );
  const [skills, setSkills] = useState<SkillChoice[]>(user.skills);
  const [visibility, setVisibility] = useState<ProfileVisibility>(
    user.visibility ?? DEFAULT_PROFILE_VISIBILITY,
  );
  const [error, setError] = useState<string | null>(null);

  function toggleVisibility(key: keyof ProfileVisibility) {
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function onSave() {
    if (!experienceLevel) {
      setError("Choose an experience level.");
      return;
    }
    if (skills.length < 1) {
      setError("Add at least one skill.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const next = await updateProfile({
          bio,
          experienceLevel,
          skills,
          visibility,
        });
        patchUser(next);
        setBio(next.bio ?? "");
        setExperienceLevel(next.experienceLevel);
        setSkills(next.skills);
        setVisibility(next.visibility);
        pushToast("Profile saved", "success");
      } catch (err) {
        const message = errorMessage(err, "Could not save your profile");
        setError(message);
        pushToast(message, "error");
      }
    });
  }

  const publicHref = user.username ? profilePath(user.username) : null;

  return (
    <div className={embedded ? "" : "mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10"}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {embedded ? (
            <>
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                Learning profile
              </h2>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-muted">
                Bio, level, and skills so recommendations and your public profile match your goals.
              </p>
            </>
          ) : (
            <>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                Edit profile
              </p>
              <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                Your learning profile
              </h1>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-muted">
                Personalize your bio, level, and skills so recommendations and your public
                profile match your goals.
              </p>
            </>
          )}
        </div>
        {publicHref ? (
          <Link
            href={publicHref}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-border-strong hover:bg-surface-subtle"
          >
            <Icon name="external" className="h-4 w-4" />
            View public profile
          </Link>
        ) : null}
      </div>

      <div className={embedded ? "mt-8 space-y-8" : "mt-10 space-y-12"}>
        <section className="rounded-3xl border border-border bg-surface p-5 sm:p-8">
          <ProfileStep
            variant="editor"
            name={user.name}
            email={user.email}
            avatarUrl={user.avatarUrl}
            bio={bio}
            experienceLevel={experienceLevel}
            onBio={setBio}
            onLevel={setExperienceLevel}
          />
        </section>

        <section className="rounded-3xl border border-border bg-surface p-5 sm:p-8">
          <SkillsStep
            variant="editor"
            skills={skills}
            experienceLevel={experienceLevel}
            onChange={setSkills}
          />
        </section>

        <section className="rounded-3xl border border-border bg-surface p-5 sm:p-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            Visibility
          </p>
          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            What visitors can see
          </h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-muted">
            Your name, photo, bio, and follower counts stay public. Toggle which activity
            sections appear on your profile.
          </p>

          <ul className="mt-6 divide-y divide-border border-y border-border">
            {PROFILE_VISIBILITY_OPTIONS.map((option) => {
              const on = visibility[option.id];
              return (
                <li
                  key={option.id}
                  className="flex flex-wrap items-center justify-between gap-4 py-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{option.label}</p>
                    <p className="mt-1 text-sm text-ink-muted">{option.description}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={`${option.label}: ${on ? "visible" : "hidden"}`}
                    onClick={() => toggleVisibility(option.id)}
                    className={[
                      "relative h-7 w-12 shrink-0 rounded-full transition",
                      on ? "bg-brand" : "bg-border-strong",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition",
                        on ? "left-[1.35rem]" : "left-0.5",
                      ].join(" ")}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted" role="status">
          {error ? <span className="text-rose-600">{error}</span> : null}
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={onSave}
          className="inline-flex items-center justify-center rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save profile"}
        </button>
      </div>
    </div>
  );
}
