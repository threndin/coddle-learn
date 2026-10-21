import { notFound } from "next/navigation";
import { MentorProfileView } from "@/components/mentors/mentor-profile-view";
import { loadMentor } from "@/lib/mentors-server";

export default async function MentorProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const mentor = await loadMentor(username);
  if (!mentor) notFound();
  return <MentorProfileView initial={mentor} />;
}
