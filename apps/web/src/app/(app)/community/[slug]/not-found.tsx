import Link from "next/link";

export default function CommunityPostNotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col items-center justify-center px-5 py-16 text-center">
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Post not found</h1>
      <p className="mt-2 text-sm text-ink-muted">
        It may have been deleted, or the link is no longer valid.
      </p>
      <Link
        href="/community"
        className="mt-6 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
      >
        Back to community
      </Link>
    </div>
  );
}
