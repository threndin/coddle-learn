"use client";

import { useEffect, useState } from "react";
import {
  SEARCH_SUGGESTIONS,
  type AssistantConversationDetail,
  type AssistantStatus,
} from "@coddle/shared";
import { quotaRemainingLabel } from "@/lib/assistant";
import { AssistantComposer } from "@/components/assistant/assistant-composer";
import { AssistantHistoryPanel } from "@/components/assistant/assistant-history-panel";
import { AssistantThread } from "@/components/assistant/assistant-thread";
import { useAssistantChat } from "@/components/assistant/use-assistant-chat";
import { Icon } from "@/components/ui/icon";

export function AssistantPage({
  seedQuery = "",
  initialStatus = null,
  initialConversation = null,
}: {
  seedQuery?: string;
  initialStatus?: AssistantStatus | null;
  initialConversation?: AssistantConversationDetail | null;
}) {
  const chat = useAssistantChat({
    initialStatus,
    initialConversation,
    restoreLast: !seedQuery,
  });
  const [historyOpen, setHistoryOpen] = useState(false);
  const empty = chat.messages.length === 0 && !chat.pending && !chat.loadingChat;

  useEffect(() => {
    if (seedQuery && !initialConversation) chat.setInput(seedQuery);
    // Seed from ?q= once when the page loads a new chat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedQuery]);

  const placeholder = chat.depleted
    ? `More messages on ${chat.resetDay}`
    : "Ask anything about what to learn next";

  return (
    <div className="relative flex min-h-[calc(100svh-4rem)] flex-col bg-surface">
      <div className="flex shrink-0 items-center justify-end gap-2 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => {
            chat.newChat();
            setHistoryOpen(false);
          }}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-ink shadow-sm transition hover:bg-surface-subtle"
          aria-label="New chat"
        >
          <Icon name="plus" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-ink shadow-sm transition hover:bg-surface-subtle"
          aria-label="Chat history"
        >
          <Icon name="clock" className="h-4 w-4" />
        </button>
        <QuotaChip
          remaining={chat.quota.remaining}
          limit={chat.quota.limit}
          label={quotaRemainingLabel(chat.quota)}
          depleted={chat.depleted}
          low={chat.low}
        />
      </div>

      {empty ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-24 pt-12">
          <h1 className="mt-5 text-center font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            What do you want to learn?
          </h1>
          <p className="mt-4 max-w-md text-center text-sm text-ink-muted">
            Ask the assistant what to learn next, which course to take, or how a skill fits your
            path.
          </p>
          <div className="mt-8 w-full max-w-2xl">
            <AssistantComposer
              id="assistant-home"
              value={chat.input}
              onChange={chat.setInput}
              onSubmit={() => void chat.send(chat.input)}
              disabled={chat.depleted}
              pending={chat.pending}
              placeholder={placeholder}
              autoFocus
              composerRef={chat.composer}
            />
          </div>
          {!chat.depleted ? (
            <div className="mt-6 flex max-w-2xl flex-wrap justify-center gap-2">
              {SEARCH_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void chat.send(suggestion)}
                  className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-ink-muted transition hover:border-border-strong hover:text-ink"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm font-medium text-ink">
              You’ve used this week’s messages. More on {chat.resetDay}.
            </p>
          )}
          {chat.error ? (
            <p className="mt-4 text-sm font-medium text-red-600">{chat.error}</p>
          ) : null}
        </div>
      ) : (
        <>
          <div ref={chat.scroller} className="flex-1 overflow-y-auto">
            <AssistantThread
              messages={chat.messages}
              pending={chat.pending || chat.loadingChat}
              error={chat.error}
              depleted={chat.depleted}
              onFollowUp={(text) => void chat.send(text)}
            />
          </div>
          <div className="border-t border-border bg-surface px-4 py-4 sm:px-6">
            <div className="mx-auto w-full max-w-2xl">
              <AssistantComposer
                id="assistant-followup"
                value={chat.input}
                onChange={chat.setInput}
                onSubmit={() => void chat.send(chat.input)}
                disabled={chat.depleted}
                pending={chat.pending}
                placeholder={placeholder}
                composerRef={chat.composer}
              />
            </div>
          </div>
        </>
      )}

      <AssistantHistoryPanel
        open={historyOpen}
        activeId={chat.conversationId}
        onClose={() => setHistoryOpen(false)}
        onNewChat={() => {
          chat.newChat();
          setHistoryOpen(false);
        }}
        onOpenChat={(id) => {
          void chat.openConversation(id);
          setHistoryOpen(false);
        }}
      />
    </div>
  );
}

function QuotaChip({
  remaining,
  limit,
  label,
  depleted,
  low,
}: {
  remaining: number;
  limit: number;
  label: string;
  depleted: boolean;
  low: boolean;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        className={[
          "inline-flex items-center rounded-full border border-border bg-surface px-2.5 py-1.5 font-mono text-[11px] font-medium tabular-nums shadow-sm",
          depleted ? "text-ink" : low ? "text-brand" : "text-ink-muted",
        ].join(" ")}
        aria-label={label}
      >
        {remaining}/{limit}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full z-20 mt-1 hidden whitespace-nowrap rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-ink shadow-md group-hover:block group-focus-within:block"
      >
        {label}
      </span>
    </div>
  );
}
