"use client";

import { useEffect, useState } from "react";
import {
  ASSESSMENT_LIMITS,
  ASSESSMENT_QUESTION_KINDS,
  ASSESSMENT_QUESTION_KIND_META,
  TRUE_FALSE_OPTIONS,
  type AssessmentQuestionKind,
} from "@coddle/shared";
import { Icon } from "@/components/ui/icon";
import type { StudioAssessment, StudioAssessmentQuestion } from "@/lib/studio";

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function blankQuestion(kind: AssessmentQuestionKind = "multiple_choice"): StudioAssessmentQuestion {
  if (kind === "true_false") {
    return {
      id: newId(),
      kind,
      prompt: "",
      explanation: "",
      points: 1,
      options: TRUE_FALSE_OPTIONS.map((option) => ({ ...option })),
      correctOptionId: "true",
      acceptedAnswers: [],
    };
  }
  if (kind === "short_answer") {
    return {
      id: newId(),
      kind,
      prompt: "",
      explanation: "",
      points: 1,
      options: [],
      correctOptionId: null,
      acceptedAnswers: [""],
    };
  }
  const a = newId();
  const b = newId();
  return {
    id: newId(),
    kind: "multiple_choice",
    prompt: "",
    explanation: "",
    points: 1,
    options: [
      { id: a, text: "" },
      { id: b, text: "" },
    ],
    correctOptionId: a,
    acceptedAnswers: [],
  };
}

function emptyAssessment(): Omit<StudioAssessment, "id" | "updatedAt"> {
  return {
    title: "Final assessment",
    summary: "",
    passPercent: ASSESSMENT_LIMITS.passPercentDefault,
    timeLimitMinutes: 30,
    questions: [blankQuestion(), blankQuestion(), blankQuestion()],
  };
}

export function AssessmentPane({
  assessment,
  readOnly,
  onSave,
}: {
  assessment: StudioAssessment | null;
  readOnly: boolean;
  onSave: (input: {
    title: string;
    summary: string;
    passPercent: number;
    timeLimitMinutes: number | null;
    questions: StudioAssessmentQuestion[];
  }) => Promise<void>;
}) {
  const [draft, setDraft] = useState(() => assessment ?? { id: "", updatedAt: "", ...emptyAssessment() });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft(assessment ?? { id: "", updatedAt: "", ...emptyAssessment() });
  }, [assessment]);

  function updateQuestion(id: string, patch: Partial<StudioAssessmentQuestion>) {
    setDraft((prev) => ({
      ...prev,
      questions: prev.questions.map((question) =>
        question.id === id ? { ...question, ...patch } : question,
      ),
    }));
  }

  function setKind(id: string, kind: AssessmentQuestionKind) {
    const next = blankQuestion(kind);
    setDraft((prev) => ({
      ...prev,
      questions: prev.questions.map((question) =>
        question.id === id ? { ...next, id: question.id, prompt: question.prompt } : question,
      ),
    }));
  }

  async function handleSave() {
    setBusy(true);
    try {
      await onSave({
        title: draft.title,
        summary: draft.summary,
        passPercent: draft.passPercent,
        timeLimitMinutes: draft.timeLimitMinutes,
        questions: draft.questions,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-1 py-2">
      <div>
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          Final assessment
        </p>
        <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink">
          Course check
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Learners take this after finishing every lesson and exercise. Need at least{" "}
          {ASSESSMENT_LIMITS.questionsMin} questions before you can submit the course.
        </p>
      </div>

      <label className="block">
        <span className="text-xs font-semibold text-ink">Title</span>
        <input
          value={draft.title}
          disabled={readOnly}
          maxLength={ASSESSMENT_LIMITS.titleMax}
          onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
          className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-ink">Summary</span>
        <textarea
          value={draft.summary}
          disabled={readOnly}
          rows={3}
          maxLength={ASSESSMENT_LIMITS.summaryMax}
          onChange={(event) => setDraft((prev) => ({ ...prev, summary: event.target.value }))}
          className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
        />
      </label>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-xs text-ink-muted">
          Pass mark
          <select
            value={draft.passPercent}
            disabled={readOnly}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, passPercent: Number(event.target.value) }))
            }
            className="rounded-lg border border-border bg-surface px-2 py-1 font-mono text-xs text-ink"
          >
            {[50, 60, 70, 80, 90, 100].map((value) => (
              <option key={value} value={value}>
                {value}%
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-ink-muted">
          Time limit (minutes)
          <input
            type="number"
            min={ASSESSMENT_LIMITS.timeLimitMin}
            max={ASSESSMENT_LIMITS.timeLimitMax}
            value={draft.timeLimitMinutes ?? ""}
            disabled={readOnly}
            onChange={(event) => {
              const value = event.target.value;
              setDraft((prev) => ({
                ...prev,
                timeLimitMinutes: value === "" ? null : Number(value),
              }));
            }}
            className="w-20 rounded-lg border border-border bg-surface px-2 py-1 font-mono text-xs text-ink"
          />
        </label>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-ink">
            Questions{" "}
            <span className="font-normal text-ink-muted">({draft.questions.length})</span>
          </p>
          {!readOnly ? (
            <button
              type="button"
              onClick={() =>
                setDraft((prev) => ({
                  ...prev,
                  questions: [...prev.questions, blankQuestion()],
                }))
              }
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand"
            >
              <Icon name="plus" className="h-3.5 w-3.5" />
              Add question
            </button>
          ) : null}
        </div>

        {draft.questions.map((question, index) => (
          <div key={question.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-ink-muted">{index + 1}.</span>
              <select
                value={question.kind}
                disabled={readOnly}
                onChange={(event) =>
                  setKind(question.id, event.target.value as AssessmentQuestionKind)
                }
                className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-ink"
              >
                {ASSESSMENT_QUESTION_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {ASSESSMENT_QUESTION_KIND_META[kind].label}
                  </option>
                ))}
              </select>
              {!readOnly ? (
                <button
                  type="button"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      questions: prev.questions.filter((item) => item.id !== question.id),
                    }))
                  }
                  className="ml-auto text-xs font-semibold text-rose-600"
                >
                  Remove
                </button>
              ) : null}
            </div>

            <textarea
              value={question.prompt}
              disabled={readOnly}
              rows={2}
              maxLength={ASSESSMENT_LIMITS.promptMax}
              onChange={(event) => updateQuestion(question.id, { prompt: event.target.value })}
              placeholder="Ask a question"
              className="mt-3 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
            />

            {question.kind === "short_answer" ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold text-ink-muted">Accepted answers</p>
                {question.acceptedAnswers.map((answer, answerIndex) => (
                  <input
                    key={`${question.id}-a-${answerIndex}`}
                    value={answer}
                    disabled={readOnly}
                    onChange={(event) => {
                      const next = [...question.acceptedAnswers];
                      next[answerIndex] = event.target.value;
                      updateQuestion(question.id, { acceptedAnswers: next });
                    }}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                    placeholder="Exact match (case-insensitive)"
                  />
                ))}
                {!readOnly ? (
                  <button
                    type="button"
                    onClick={() =>
                      updateQuestion(question.id, {
                        acceptedAnswers: [...question.acceptedAnswers, ""],
                      })
                    }
                    className="text-xs font-semibold text-brand"
                  >
                    Add accepted answer
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {question.options.map((option) => (
                  <label key={option.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${question.id}`}
                      checked={question.correctOptionId === option.id}
                      disabled={readOnly || question.kind === "true_false" ? false : readOnly}
                      onChange={() => updateQuestion(question.id, { correctOptionId: option.id })}
                    />
                    <input
                      value={option.text}
                      disabled={readOnly || question.kind === "true_false"}
                      onChange={(event) =>
                        updateQuestion(question.id, {
                          options: question.options.map((item) =>
                            item.id === option.id
                              ? { ...item, text: event.target.value }
                              : item,
                          ),
                        })
                      }
                      className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
                    />
                  </label>
                ))}
                {question.kind === "multiple_choice" && !readOnly ? (
                  <button
                    type="button"
                    onClick={() =>
                      updateQuestion(question.id, {
                        options: [...question.options, { id: newId(), text: "" }],
                      })
                    }
                    className="text-xs font-semibold text-brand"
                  >
                    Add option
                  </button>
                ) : null}
              </div>
            )}

            <textarea
              value={question.explanation}
              disabled={readOnly}
              rows={2}
              maxLength={ASSESSMENT_LIMITS.explanationMax}
              onChange={(event) =>
                updateQuestion(question.id, { explanation: event.target.value })
              }
              placeholder="Explanation shown after submit (optional)"
              className="mt-3 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
            />
          </div>
        ))}
      </div>

      {!readOnly ? (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSave()}
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save assessment"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
