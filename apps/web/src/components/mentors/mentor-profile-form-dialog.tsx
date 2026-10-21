"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MENTOR_AVAILABILITIES,
  MENTOR_AVAILABILITY_LABELS,
  MENTOR_LIMITS,
  MENTOR_TOPIC_BLURBS,
  MENTOR_TOPIC_LABELS,
  MENTOR_TOPICS,
  type MentorAvailability,
  type MentorTopic,
} from "@coddle/shared";
import { FieldLabel, SkillPicker, inputClass } from "@/components/studio/course-fields";
import { errorMessage } from "@/lib/api-client";
import { saveMentorProfile, type MentorCard, type MentorProfileInput } from "@/lib/mentors";

export function MentorProfileFormDialog({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: MentorCard | null;
  onClose: () => void;
  onSaved: (mentor: MentorCard) => void;
}) {
  const titleId = useId();
  const headlineRef = useRef<HTMLInputElement>(null);
  const [headline, setHeadline] = useState("");
  const [about, setAbout] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [timezone, setTimezone] = useState("");
  const [availability, setAvailability] = useState<MentorAvailability>("open");
  const [topics, setTopics] = useState<MentorTopic[]>(["learning"]);
  const [skillSlugs, setSkillSlugs] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready =
    headline.trim().length >= MENTOR_LIMITS.headlineMin &&
    headline.trim().length <= MENTOR_LIMITS.headlineMax &&
    about.trim().length >= MENTOR_LIMITS.aboutMin &&
    about.trim().length <= MENTOR_LIMITS.aboutMax &&
    topics.length >= MENTOR_LIMITS.topicMin;

  const closeRef = useRef({ onClose, pending });
  useEffect(() => {
    closeRef.current = { onClose, pending };
  });

  useEffect(() => {
    if (!open) return;
    setHeadline(initial?.headline ?? "");
    setAbout(initial?.about ?? "");
    setExperienceYears(initial?.experienceYears != null ? String(initial.experienceYears) : "");
    setTimezone(initial?.timezone ?? "");
    setAvailability(
      initial && (MENTOR_AVAILABILITIES as readonly string[]).includes(initial.availability)
        ? (initial.availability as MentorAvailability)
        : "open",
    );
    setTopics(
      (initial?.topics.filter((topic): topic is MentorTopic =>
        (MENTOR_TOPICS as readonly string[]).includes(topic),
      ) ?? ["learning"]) as MentorTopic[],
    );
    setSkillSlugs(initial?.skills.map((skill) => skill.slug) ?? []);
    setError(null);
    const previous = document.activeElement;
    headlineRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !closeRef.current.pending) closeRef.current.onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open, initial]);

  function toggleTopic(topic: MentorTopic) {
    setTopics((prev) =>
      prev.includes(topic)
        ? prev.filter((item) => item !== topic)
        : [...prev, topic].slice(0, MENTOR_LIMITS.topicMax),
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || pending) return;
    const years = experienceYears.trim();
    const parsedYears = years ? Number.parseInt(years, 10) : null;
    const input: MentorProfileInput = {
      headline: headline.trim(),
      about: about.trim(),
      experienceYears:
        parsedYears != null && Number.isFinite(parsedYears) ? parsedYears : null,
      availability,
      timezone: timezone.trim(),
      topics,
      skillSlugs,
    };
    setPending(true);
    setError(null);
    try {
      const { mentor } = await saveMentorProfile(input);
      onSaved(mentor);
    } catch (err) {
      setError(errorMessage(err, "Could not save your mentor profile"));
    } finally {
      setPending(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={() => !pending && onClose()}
      />
      <form
        onSubmit={(event) => void submit(event)}
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        aria-labelledby={titleId}
      >
        <div className="border-b border-border px-5 py-4">
          <h2 id={titleId} className="font-display text-xl font-bold text-ink">
            {initial ? "Edit mentor profile" : "Become a mentor"}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Learners apply to your programs. You choose who joins.
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <FieldLabel
              htmlFor="mentor-headline"
              label="Headline"
              count={headline.trim().length}
              max={MENTOR_LIMITS.headlineMax}
            />
            <input
              id="mentor-headline"
              ref={headlineRef}
              value={headline}
              maxLength={MENTOR_LIMITS.headlineMax}
              onChange={(event) => setHeadline(event.target.value)}
              placeholder="Who you help, and with what"
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel
              htmlFor="mentor-about"
              label="About"
              count={about.trim().length}
              max={MENTOR_LIMITS.aboutMax}
            />
            <textarea
              id="mentor-about"
              value={about}
              maxLength={MENTOR_LIMITS.aboutMax}
              onChange={(event) => setAbout(event.target.value)}
              rows={5}
              placeholder="Your background, how you mentor, and what a good fit looks like."
              className={`${inputClass} min-h-32 resize-y`}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="mentor-years" label="Years of experience" />
              <input
                id="mentor-years"
                type="number"
                min={0}
                max={MENTOR_LIMITS.experienceYearsMax}
                value={experienceYears}
                onChange={(event) => setExperienceYears(event.target.value)}
                placeholder="Optional"
                className={inputClass}
              />
            </div>
            <div>
              <FieldLabel htmlFor="mentor-timezone" label="Timezone" />
              <input
                id="mentor-timezone"
                value={timezone}
                maxLength={MENTOR_LIMITS.timezoneMax}
                onChange={(event) => setTimezone(event.target.value)}
                placeholder="America/New_York"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="mentor-availability" label="Availability" />
            <select
              id="mentor-availability"
              value={availability}
              onChange={(event) => setAvailability(event.target.value as MentorAvailability)}
              className={inputClass}
            >
              {MENTOR_AVAILABILITIES.map((item) => (
                <option key={item} value={item}>
                  {MENTOR_AVAILABILITY_LABELS[item]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel label="Topics you will help with" />
            <div className="flex flex-wrap gap-2">
              {MENTOR_TOPICS.map((topic) => {
                const active = topics.includes(topic);
                return (
                  <button
                    key={topic}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleTopic(topic)}
                    className={[
                      "rounded-xl border px-3 py-2 text-left text-xs transition",
                      active
                        ? "border-brand bg-brand text-white"
                        : "border-border bg-surface text-ink-muted hover:border-border-strong hover:text-ink",
                    ].join(" ")}
                  >
                    <span className="block font-semibold">{MENTOR_TOPIC_LABELS[topic]}</span>
                    <span className={active ? "opacity-80" : ""}>{MENTOR_TOPIC_BLURBS[topic]}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <FieldLabel label="Technologies" />
            <SkillPicker
              value={skillSlugs}
              onChange={setSkillSlugs}
              max={MENTOR_LIMITS.skillMax}
              footnote="Shown on your mentor card so learners can find you."
            />
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="rounded-xl px-3.5 py-2 text-sm font-semibold text-ink-muted transition hover:text-ink disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!ready || pending}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:opacity-50"
          >
            {pending ? "Saving…" : initial ? "Save profile" : "Publish mentor profile"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
