"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import {
  COMMUNITY_LIMITS,
  COMMUNITY_REPORT_REASON_LABELS,
  COMMUNITY_REPORT_REASONS,
  type CommunityReportReason,
} from "@coddle/shared";
import { FieldLabel, inputClass } from "@/components/studio/course-fields";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/app/toast";
import { errorMessage } from "@/lib/api-client";
import { reportCommunityComment, reportCommunityPost } from "@/lib/community";

export function ReportDialog({
  open,
  target,
  onClose,
}: {
  open: boolean;
  target: { type: "post" | "comment"; id: string; label: string } | null;
  onClose: () => void;
}) {
  const titleId = useId();
  const { pushToast } = useToast();
  const [reason, setReason] = useState<CommunityReportReason>("spam");
  const [details, setDetails] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detailsRequired = reason === "other";
  const detailsOk =
    details.trim().length <= COMMUNITY_LIMITS.reportDetailsMax &&
    (!detailsRequired || details.trim().length > 0);

  useEffect(() => {
    if (!open) return;
    setReason("spam");
    setDetails("");
    setError(null);
    setPending(false);
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onClose();
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, pending]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!target || !detailsOk || pending) return;
    setPending(true);
    setError(null);
    try {
      const payload = {
        reason,
        details: details.trim() || undefined,
      };
      if (target.type === "post") {
        await reportCommunityPost(target.id, payload);
      } else {
        await reportCommunityComment(target.id, payload);
      }
      pushToast("Report submitted. Thanks for helping keep the community safe.", "success");
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Could not submit report"));
    } finally {
      setPending(false);
    }
  }

  if (!open || !target || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        disabled={pending}
        onClick={() => {
          if (!pending) onClose();
        }}
        className="fixed inset-0 bg-ink/40 backdrop-blur-[2px]"
      />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={(event) => void submit(event)}
        className="relative my-auto w-full max-w-md rounded-2xl border border-border bg-surface shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 id={titleId} className="font-display text-xl font-bold tracking-tight text-ink">
              Report {target.type}
            </h2>
            <p className="mt-1 text-sm text-ink-muted line-clamp-2">{target.label}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label="Close"
            className="rounded-lg p-1.5 text-ink-muted transition hover:bg-surface-subtle hover:text-ink disabled:opacity-50"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <FieldLabel label="Reason" />
            <div role="radiogroup" aria-label="Report reason" className="space-y-2">
              {COMMUNITY_REPORT_REASONS.map((option) => (
                <label
                  key={option}
                  className={[
                    "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition",
                    reason === option
                      ? "border-brand bg-brand-soft text-ink"
                      : "border-border text-ink-muted hover:border-border-strong hover:text-ink",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={option}
                    checked={reason === option}
                    onChange={() => setReason(option)}
                    className="accent-[var(--brand)]"
                  />
                  {COMMUNITY_REPORT_REASON_LABELS[option]}
                </label>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel
              htmlFor="report-details"
              label="Details"
              hint={detailsRequired ? "Required for this reason." : "Optional context for moderators."}
              count={details.length}
              max={COMMUNITY_LIMITS.reportDetailsMax}
            />
            <textarea
              id="report-details"
              rows={3}
              value={details}
              maxLength={COMMUNITY_LIMITS.reportDetailsMax}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="What should moderators know?"
              className={`${inputClass} resize-y leading-relaxed`}
            />
          </div>

          {error ? (
            <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-border p-5">
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-subtle disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending || !detailsOk}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="alert" className="h-4 w-4" />
            {pending ? "Submitting…" : "Submit report"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
