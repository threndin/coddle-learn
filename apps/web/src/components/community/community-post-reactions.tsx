import Link from "next/link";
import { COMMUNITY_REACTION_EMOJIS, type CommunityReactionEmoji } from "@coddle/shared";
import { ProfileAvatar } from "@/components/onboarding/profile-avatar";
import { ProfileLink } from "@/components/profile/profile-link";
import { Icon } from "@/components/ui/icon";
import {
  communityPostPath,
  type CommunityPostReactions,
} from "@/lib/community";
import { pluralize, timeAgo } from "@/lib/format";

export function CommunityPostReactionsView({ data }: { data: CommunityPostReactions }) {
  const quotes = data.quotes ?? [];
  const quoteCount = data.quoteCount ?? quotes.length;
  const activeEmojis = COMMUNITY_REACTION_EMOJIS.filter(
    (emoji) => (data.reactionCounts[emoji] ?? 0) > 0,
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
      <Link
        href={communityPostPath(data.post)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted transition hover:text-ink"
      >
        <Icon name="arrowLeft" className="h-4 w-4" />
        Back to post
      </Link>

      <header className="mt-6 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Reactions & quotes
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {data.post.title}
        </h1>
        <p className="text-sm text-ink-muted">
          {pluralize(data.total, "reaction")} · {pluralize(quoteCount, "quote")}
        </p>
      </header>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-ink">Reactions</h2>
        {activeEmojis.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {activeEmojis.map((emoji) => (
              <span
                key={emoji}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-subtle px-2.5 py-1 text-sm text-ink"
              >
                <span aria-hidden>{emoji}</span>
                <span className="font-semibold tabular-nums">
                  {data.reactionCounts[emoji]}
                </span>
              </span>
            ))}
          </div>
        ) : null}

        {data.reactions.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border px-5 py-8 text-center">
            <p className="text-sm text-ink-muted">No reactions yet.</p>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {data.reactions.map((reaction) => (
              <li key={reaction.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                <ProfileLink user={reaction.user} className="shrink-0">
                  <ProfileAvatar
                    name={reaction.user.name}
                    avatarUrl={reaction.user.avatarUrl}
                    size="sm"
                  />
                </ProfileLink>
                <div className="min-w-0 flex-1">
                  <ProfileLink
                    user={reaction.user}
                    className="truncate text-sm font-semibold text-ink transition hover:text-brand"
                  >
                    {reaction.user.name}
                  </ProfileLink>
                  <p className="text-xs text-ink-muted">{timeAgo(reaction.createdAt)}</p>
                </div>
                <span
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-subtle text-lg"
                  title={emojiLabel(reaction.emoji)}
                  aria-label={emojiLabel(reaction.emoji)}
                >
                  {reaction.emoji}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-ink">Quotes</h2>
        {quotes.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border px-5 py-8 text-center">
            <p className="text-sm text-ink-muted">No quotes yet.</p>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {quotes.map((quote) => (
              <li key={quote.id}>
                <Link
                  href={communityPostPath(quote)}
                  className="flex items-start gap-3 px-4 py-3.5 transition hover:bg-surface-subtle/60 sm:px-5"
                >
                  <ProfileAvatar
                    name={quote.author.name}
                    avatarUrl={quote.author.avatarUrl}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <p className="truncate text-sm font-semibold text-ink">
                        {quote.author.name}
                      </p>
                      <p className="text-xs text-ink-muted">{timeAgo(quote.createdAt)}</p>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold text-ink">{quote.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-ink-muted">
                      {quote.body}
                    </p>
                  </div>
                  <Icon name="quote" className="mt-1 h-4 w-4 shrink-0 text-ink-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function emojiLabel(emoji: CommunityReactionEmoji) {
  return `Reacted with ${emoji}`;
}
