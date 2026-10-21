import { MentorDesk } from "@/components/mentors/mentor-desk";
import { loadMentorshipDesk } from "@/lib/mentors-server";

export default async function MentorshipDeskPage() {
  const desk = await loadMentorshipDesk();
  if (!desk) {
    return (
      <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
        <h1 className="font-display text-2xl font-bold text-ink">Mentor desk</h1>
        <p className="mt-2 text-sm text-ink-muted">Could not load your mentorship desk.</p>
      </div>
    );
  }
  return <MentorDesk initial={desk} />;
}
