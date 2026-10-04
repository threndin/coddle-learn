import Link from "next/link";

export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-start px-5 py-16 sm:px-8">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-brand">
        Coming soon
      </p>
      <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-lg text-base leading-relaxed text-ink-muted">{description}</p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex items-center justify-center rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
