const items = [
  "Roadmaps",
  "Courses",
  "Projects",
  "Assessments",
  "Credentials",
  "Mentorship",
  "Skill Graphs",
  "Community",
  "Open Source",
  "Badges",
];

export function Marquee() {
  const row = [...items, ...items];

  return (
    <section
      aria-label="Platform capabilities"
      className="overflow-hidden border-y border-border bg-surface-subtle py-3.5"
    >
      <div className="flex w-max animate-marquee">
        {row.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="mx-6 flex items-center gap-6 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink-muted sm:mx-8"
          >
            {item}
            <span className="text-brand" aria-hidden>
              ◆
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}
