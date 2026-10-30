"use client";

import type { SearchHit } from "@coddle/shared";
import { Icon } from "@/components/ui/icon";
import { SearchHitCard } from "@/components/search/search-hit";
import { AssistantMarkdown } from "@/components/assistant/assistant-markdown";
import type { AssistantChatMessage } from "@/components/assistant/use-assistant-chat";

export function AssistantThread({
  messages,
  pending,
  error,
  depleted,
  onFollowUp,
}: {
  messages: AssistantChatMessage[];
  pending: boolean;
  error: string | null;
  depleted?: boolean;
  onFollowUp?: (text: string) => void;
}) {
  const lastAssistantId = [...messages].reverse().find((row) => row.role === "assistant")?.id;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 pb-6 pt-2 sm:px-6">
      {messages.map((message) =>
        message.role === "user" ? (
          <UserBubble key={message.id} content={message.content} />
        ) : (
          <AssistantBubble
            key={message.id}
            content={message.content}
            hits={message.hits}
            followUps={message.id === lastAssistantId && !pending ? message.followUps : undefined}
            depleted={depleted}
            onFollowUp={onFollowUp}
          />
        ),
      )}
      {pending ? (
        <div className="flex items-start gap-3">
          <SparkleMark />
          <p className="pt-1.5 text-sm text-ink-muted">Finding an answer…</p>
        </div>
      ) : null}
      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] whitespace-pre-wrap rounded-3xl bg-brand px-4 py-2.5 text-[15px] leading-relaxed text-white">
        {content}
      </div>
    </div>
  );
}

function AssistantBubble({
  content,
  hits,
  followUps,
  depleted,
  onFollowUp,
}: {
  content: string;
  hits?: SearchHit[];
  followUps?: string[];
  depleted?: boolean;
  onFollowUp?: (text: string) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <SparkleMark />
      <div className="min-w-0 flex-1">
        <AssistantMarkdown content={content} />
        {followUps && followUps.length > 0 && onFollowUp && !depleted ? (
          <FollowUpChips suggestions={followUps} onFollowUp={onFollowUp} />
        ) : null}
        {hits && hits.length > 0 ? (
          <div className="mt-4 space-y-2">
            {hits.map((hit) => (
              <SearchHitCard key={`${hit.type}:${hit.id}`} hit={hit} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function FollowUpChips({
  suggestions,
  onFollowUp,
}: {
  suggestions: string[];
  onFollowUp: (text: string) => void;
}) {
  if (suggestions.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">
        Continue with
      </p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onFollowUp(suggestion)}
            className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-left text-sm text-ink-muted transition hover:border-border-strong hover:text-ink"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

function SparkleMark() {
  return (
    <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
      <Icon name="sparkle" className="h-4 w-4" />
    </span>
  );
}
