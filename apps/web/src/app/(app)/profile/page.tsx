import { redirect } from "next/navigation";
import { profilePath, type LearnUser } from "@coddle/shared";
import { serverApiFetch } from "@/lib/server-api";

export default async function ProfilePage() {
  const res = await serverApiFetch("/auth/me");
  if (res.ok) {
    const body = (await res.json()) as { data: { user: LearnUser } };
    const username = body.data.user.username;
    if (username) {
      redirect(profilePath(username));
    }
  }

  redirect("/skills");
}
