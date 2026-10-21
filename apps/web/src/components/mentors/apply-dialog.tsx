"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MENTOR_LIMITS } from "@coddle/shared";
import { FieldLabel, inputClass } from "@/components/studio/course-fields";
import { topicLabel } from "@/components/mentors/mentor-badges";
import { errorMessage } from "@/lib/api-client";
import {
  applyToMentorProgram,
  type MentorshipApplication,
  type MentorProgram,
} from "@/lib/mentors";

export function ApplyDialog({
  open,
  username,
  mentorName,
  program,
  onClose,
  onApplied,
}: {
  open: boolean;
  username: string;
  mentorName: string;
  program: MentorProgram | null;
  onClose: () => void;
  onApplied: (application: MentorshipApplication) => void;
}) {
  const titleId = useId();
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [message, setMessage] = useState("");
  const [goals, setGoals] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready =
    Boolean(program) &&
    message.trim().length >= MENTOR_LIMITS.applicationMessageMin &&
    message.trim().length <= MENTOR_LIMITS.applicationMessageMax &&
    goals.trim().length <= MENTOR_LIMITS.applicationGoalsMax;

  const closeRef = useRef({ onClose, pending });
  useEffect(() => {
    closeRef.current = { onClose, pending };
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    messageRef.current?.focus();
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
  }, [open]);

  useEffect(() => {
    if (open) {
      setMessage("");
      setGoals("");
      setError(null);
    }
  }, [open, program?.id]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || pending || !program) return;
    setPending(true);
    setError(null);
    try {
      const { application } = await applyToMentorProgram(username, program.slug, {
        message: message.trim(),
        goals: goals.trim(),
      });
      onApplied(application);
    } catch (err) {
      setError(errorMessage(err, "Could not send that application"));
    } finally {
      setPending(false);
    }
  }

  if (!open || !program) return null;

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
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
            Apply to {mentorName}
          </p>
          <h2 id={titleId} className="mt-1 font-display text-xl font-bold text-ink">
            {program.title}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {topicLabel(program.kind)}. The mentor reviews every application before you join.
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <FieldLabel
              htmlFor="apply-message"
              label="Why this program"
              count={message.trim().length}
              max={MENTOR_LIMITS.applicationMessageMax}
            />
            <textarea
              id="apply-message"
              ref={messageRef}
              value={message}
              maxLength={MENTOR_LIMITS.applicationMessageMax}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              placeholder="What you are working on, and what you want help with."
              className={`${inputClass} min-h-32 resize-y`}
            />
          </div>
          <div>
            <FieldLabel
              htmlFor="apply-goals"
              label="Goals (optional)"
              count={goals.trim().length}
              max={MENTOR_LIMITS.applicationGoalsMax}
            />
            <textarea
              id="apply-goals"
              value={goals}
              maxLength={MENTOR_LIMITS.applicationGoalsMax}
              onChange={(event) => setGoals(event.target.value)}
              rows={3}
              placeholder="What would a useful month of mentorship look like?"
              className={`${inputClass} resize-y`}
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
            {pending ? "Sending…" : "Send application"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
