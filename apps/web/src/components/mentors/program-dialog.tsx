"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MENTOR_LIMITS,
  MENTOR_PROGRAM_STATUSES,
  MENTOR_PROGRAM_STATUS_LABELS,
  MENTOR_TOPIC_LABELS,
  MENTOR_TOPICS,
  type MentorProgramStatus,
  type MentorTopic,
} from "@coddle/shared";
import { FieldLabel, inputClass } from "@/components/studio/course-fields";
import { errorMessage } from "@/lib/api-client";
import {
  createMentorProgram,
  updateMentorProgram,
  type MentorProgram,
  type MentorProgramInput,
} from "@/lib/mentors";

export function ProgramDialog({
  open,
  initial,
  defaultKind,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: MentorProgram | null;
  defaultKind?: MentorTopic;
  onClose: () => void;
  onSaved: (program: MentorProgram) => void;
}) {
  const titleId = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<MentorTopic>("learning");
  const [capacity, setCapacity] = useState("");
  const [durationWeeks, setDurationWeeks] = useState("");
  const [status, setStatus] = useState<MentorProgramStatus>("open");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready =
    title.trim().length >= MENTOR_LIMITS.programTitleMin &&
    title.trim().length <= MENTOR_LIMITS.programTitleMax &&
    summary.trim().length >= MENTOR_LIMITS.programSummaryMin &&
    summary.trim().length <= MENTOR_LIMITS.programSummaryMax;

  const closeRef = useRef({ onClose, pending });
  useEffect(() => {
    closeRef.current = { onClose, pending };
  });

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
    setSummary(initial?.summary ?? "");
    setDescription(initial?.description ?? "");
    setKind(
      initial && (MENTOR_TOPICS as readonly string[]).includes(initial.kind)
        ? (initial.kind as MentorTopic)
        : (defaultKind ?? "learning"),
    );
    setCapacity(initial?.capacity != null ? String(initial.capacity) : "");
    setDurationWeeks(initial?.durationWeeks != null ? String(initial.durationWeeks) : "");
    setStatus(
      initial && (MENTOR_PROGRAM_STATUSES as readonly string[]).includes(initial.status)
        ? (initial.status as MentorProgramStatus)
        : "open",
    );
    setError(null);
    const previous = document.activeElement;
    titleRef.current?.focus();
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
  }, [open, initial, defaultKind]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || pending) return;
    const cap = capacity.trim() ? Number.parseInt(capacity, 10) : null;
    const weeks = durationWeeks.trim() ? Number.parseInt(durationWeeks, 10) : null;
    const input: MentorProgramInput = {
      title: title.trim(),
      summary: summary.trim(),
      description: description.trim(),
      kind,
      capacity: cap != null && Number.isFinite(cap) ? cap : null,
      durationWeeks: weeks != null && Number.isFinite(weeks) ? weeks : null,
      status,
    };
    setPending(true);
    setError(null);
    try {
      const { program } = initial
        ? await updateMentorProgram(initial.id, input)
        : await createMentorProgram(input);
      onSaved(program);
    } catch (err) {
      setError(errorMessage(err, "Could not save that program"));
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
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        aria-labelledby={titleId}
      >
        <div className="border-b border-border px-5 py-4">
          <h2 id={titleId} className="font-display text-xl font-bold text-ink">
            {initial ? "Edit program" : "New mentorship program"}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Learners apply. You approve who joins.
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <FieldLabel
              htmlFor="program-title"
              label="Title"
              count={title.trim().length}
              max={MENTOR_LIMITS.programTitleMax}
            />
            <input
              id="program-title"
              ref={titleRef}
              value={title}
              maxLength={MENTOR_LIMITS.programTitleMax}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Frontend career circle"
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel
              htmlFor="program-summary"
              label="Summary"
              count={summary.trim().length}
              max={MENTOR_LIMITS.programSummaryMax}
            />
            <textarea
              id="program-summary"
              value={summary}
              maxLength={MENTOR_LIMITS.programSummaryMax}
              onChange={(event) => setSummary(event.target.value)}
              rows={3}
              placeholder="Who this is for, and what you will work on together."
              className={`${inputClass} resize-y`}
            />
          </div>
          <div>
            <FieldLabel
              htmlFor="program-description"
              label="Details"
              count={description.trim().length}
              max={MENTOR_LIMITS.programDescriptionMax}
            />
            <textarea
              id="program-description"
              value={description}
              maxLength={MENTOR_LIMITS.programDescriptionMax}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
              placeholder="Expectations, cadence, and how you review applications."
              className={`${inputClass} min-h-28 resize-y`}
            />
          </div>
          <div>
            <FieldLabel htmlFor="program-kind" label="Focus" />
            <select
              id="program-kind"
              value={kind}
              onChange={(event) => setKind(event.target.value as MentorTopic)}
              className={inputClass}
            >
              {MENTOR_TOPICS.map((item) => (
                <option key={item} value={item}>
                  {MENTOR_TOPIC_LABELS[item]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <FieldLabel htmlFor="program-capacity" label="Capacity" />
              <input
                id="program-capacity"
                type="number"
                min={1}
                max={MENTOR_LIMITS.capacityMax}
                value={capacity}
                onChange={(event) => setCapacity(event.target.value)}
                placeholder="Open"
                className={inputClass}
              />
            </div>
            <div>
              <FieldLabel htmlFor="program-weeks" label="Weeks" />
              <input
                id="program-weeks"
                type="number"
                min={1}
                max={MENTOR_LIMITS.durationWeeksMax}
                value={durationWeeks}
                onChange={(event) => setDurationWeeks(event.target.value)}
                placeholder="Optional"
                className={inputClass}
              />
            </div>
            <div>
              <FieldLabel htmlFor="program-status" label="Status" />
              <select
                id="program-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as MentorProgramStatus)}
                className={inputClass}
              >
                {MENTOR_PROGRAM_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {MENTOR_PROGRAM_STATUS_LABELS[item]}
                  </option>
                ))}
              </select>
            </div>
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
            {pending ? "Saving…" : initial ? "Save program" : "Create program"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
