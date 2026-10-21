import {
  mentorQueryString,
  type MentorCard,
  type MentorCatalog,
  type MentorFilters,
  type MentorshipDesk,
} from "@/lib/mentors";
import { serverApiFetch } from "@/lib/server-api";

export async function loadMentorCatalog(filters: MentorFilters): Promise<MentorCatalog | null> {
  try {
    const query = mentorQueryString(filters);
    const res = await serverApiFetch(`/mentors${query ? `?${query}` : ""}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { data: MentorCatalog };
    return body.data;
  } catch {
    return null;
  }
}

export async function loadMentor(username: string): Promise<MentorCard | null> {
  try {
    const res = await serverApiFetch(`/mentors/${encodeURIComponent(username)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { data: { mentor: MentorCard } };
    return body.data.mentor;
  } catch {
    return null;
  }
}

export async function loadMentorshipDesk(): Promise<MentorshipDesk | null> {
  try {
    const res = await serverApiFetch("/mentors/me");
    if (!res.ok) return null;
    const body = (await res.json()) as { data: MentorshipDesk };
    return body.data;
  } catch {
    return null;
  }
}
