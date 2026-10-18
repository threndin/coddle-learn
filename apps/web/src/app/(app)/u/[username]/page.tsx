import type { Metadata } from "next";
import { PublicProfileView } from "@/components/profile/public-profile-view";
import { loadPublicProfile } from "@/lib/profiles-server";

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const data = await loadPublicProfile(username);
  if (!data) {
    return { title: "Profile not found · Coddle Learn" };
  }
  const title = `${data.profile.name} (@${data.profile.username})`;
  const description =
    data.profile.bio ??
    `${data.profile.name}'s learning profile on Coddle Learn — skills, projects, and credentials.`;
  return {
    title: `${title} · Coddle Learn`,
    description,
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const initial = await loadPublicProfile(username);

  return <PublicProfileView username={username} initial={initial} />;
}
