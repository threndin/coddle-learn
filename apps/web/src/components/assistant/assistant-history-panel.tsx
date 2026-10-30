"use client";

import { useEffect, useState } from "react";
import type { AssistantConversationSummary } from "@coddle/shared";
import { Icon } from "@/components/ui/icon";
import { errorMessage } from "@/lib/api-client";
import { fetchAssistantConversations } from "@/lib/assistant";
import { timeAgo } from "@/lib/format";

export function AssistantHistoryPanel({
  open,
  activeId,
  onClose,
  onNewChat,
  onOpenChat,
}: {
  open: boolean;
  activeId: string | null;
  onClose: () => void;
  onNewChat: () => void;
  onOpenChat: (id: string) => void;
}) {
  const [rows, setRows] = useState<AssistantConversationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setError(null);
    fetchAssistantConversations(controller.signal)
      .then(setRows)
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(errorMessage(err, "Could not load chat history."));
      });
    return () => controller.abort();
  }, [open, activeId]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-20 flex justify-end bg-ink/20">
      <button type="button" className="h-full flex-1 cursor-default" aria-label="Close history" onClick={onClose} />
      <aside className="flex h-full w-full max-w-sm flex-col border-l border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="font-display text-base font-bold text-ink">Chat history</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onNewChat}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-ink transition hover:bg-surface-subtle"
            >
              <Icon name="plus" className="h-3.5 w-3.5" />
              New chat
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-surface-subtle hover:text-ink"
              aria-label="Close history"
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {error ? <p className="px-3 py-4 text-sm font-medium text-red-600">{error}</p> : null}
          {rows === null && !error ? (
            <p className="px-3 py-4 text-sm text-ink-muted">Loading chats…</p>
          ) : null}
          {rows && rows.length === 0 ? (
            <p className="px-3 py-4 text-sm text-ink-muted">
              No saved chats yet. Send a message and it will show up here.
            </p>
          ) : null}
          {rows && rows.length > 0 ? (
            <ul className="space-y-1">
              {rows.map((row) => {
                const active = row.id === activeId;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => onOpenChat(row.id)}
                      className={[
                        "w-full rounded-xl px-3 py-2.5 text-left transition",
                        active ? "bg-brand-soft text-ink" : "hover:bg-surface-subtle",
                      ].join(" ")}
                    >
                      <span className="block truncate text-sm font-semibold text-ink">{row.title}</span>
                      {row.preview ? (
                        <span className="mt-0.5 block truncate text-xs text-ink-muted">{row.preview}</span>
                      ) : null}
                      <span className="mt-1 block text-[11px] text-ink-muted">{timeAgo(row.updatedAt)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
