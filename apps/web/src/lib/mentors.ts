import type {
  MentorAvailability,
  MentorshipApplicationStatus,
  MentorProgramStatus,
  MentorScope,
  MentorSort,
  MentorTopic,
} from "@coddle/shared";
import { apiRequest } from "@/lib/api-client";

export type MentorPerson = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  bio?: string | null;
};

export type MentorProgram = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  kind: MentorTopic | string;
  capacity: number | null;
  durationWeeks: number | null;
  status: MentorProgramStatus | string;
  approvedCount: number;
  seatsLeft: number | null;
  viewerApplication: { id: string; status: MentorshipApplicationStatus | string } | null;
  createdAt: string;
  updatedAt: string;
};

export type MentorCard = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  headline: string;
  about: string;
  experienceYears: number | null;
  availability: MentorAvailability | string;
  timezone: string | null;
  topics: string[];
  skills: { slug: string; name: string }[];
  openProgramCount: number;
  programs: MentorProgram[];
  viewerApplication: { id: string; status: MentorshipApplicationStatus | string } | null;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MentorshipApplication = {
  id: string;
  status: MentorshipApplicationStatus | string;
  message: string;
  goals: string;
  mentorNote: string | null;
  mentee: MentorPerson;
  mentor: MentorPerson;
  program: {
    id: string;
    slug: string;
    title: string;
    kind: string;
    status: string;
    capacity: number | null;
  };
  createdAt: string;
  reviewedAt: string | null;
  completedAt: string | null;
};

export type MentorCatalog = {
  mentors: MentorCard[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  topicCounts: Record<MentorTopic, number>;
  skills: { slug: string; name: string; category: string }[];
  counts: { applied: number; mentoring: number };
};

export type MentorshipDesk = {
  profile: MentorCard | null;
  incoming: MentorshipApplication[];
  outgoing: MentorshipApplication[];
  counts: { pendingIncoming: number; activeMentees: number; outgoingPending: number };
};

export type MentorFilters = {
  q: string;
  topic: MentorTopic | null;
  skill: string | null;
  availability: MentorAvailability | null;
  scope: MentorScope;
  sort: MentorSort;
};

export const DEFAULT_MENTOR_FILTERS: MentorFilters = {
  q: "",
  topic: null,
  skill: null,
  availability: null,
  scope: "all",
  sort: "available",
};

export function mentorQueryString(filters: MentorFilters, page = 1): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.topic) params.set("topic", filters.topic);
  if (filters.skill) params.set("skill", filters.skill);
  if (filters.availability) params.set("availability", filters.availability);
  if (filters.scope !== "all") params.set("scope", filters.scope);
  if (filters.sort !== "available") params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));
  return params.toString();
}

export function fetchMentors(filters: MentorFilters, page = 1, signal?: AbortSignal) {
  const query = mentorQueryString(filters, page);
  return apiRequest<MentorCatalog>(`/mentors${query ? `?${query}` : ""}`, { signal });
}

export function fetchMentor(username: string, signal?: AbortSignal) {
  return apiRequest<{ mentor: MentorCard }>(`/mentors/${encodeURIComponent(username)}`, {
    signal,
  });
}

export function fetchMentorshipDesk(signal?: AbortSignal) {
  return apiRequest<MentorshipDesk>("/mentors/me", { signal });
}

export type MentorProfileInput = {
  headline: string;
  about: string;
  experienceYears: number | null;
  availability: MentorAvailability;
  timezone: string;
  topics: MentorTopic[];
  skillSlugs: string[];
};

export function saveMentorProfile(input: MentorProfileInput) {
  return apiRequest<{ mentor: MentorCard }>("/mentors/me", { method: "PUT", json: input });
}

export type MentorProgramInput = {
  title: string;
  summary: string;
  description: string;
  kind: MentorTopic;
  capacity: number | null;
  durationWeeks: number | null;
  status: MentorProgramStatus;
};

export function createMentorProgram(input: MentorProgramInput) {
  return apiRequest<{ program: MentorProgram }>("/mentors/me/programs", {
    method: "POST",
    json: input,
  });
}

export function updateMentorProgram(id: string, input: MentorProgramInput) {
  return apiRequest<{ program: MentorProgram }>(`/mentors/me/programs/${encodeURIComponent(id)}`, {
    method: "PATCH",
    json: input,
  });
}

export function applyToMentorProgram(
  username: string,
  slug: string,
  input: { message: string; goals: string },
) {
  return apiRequest<{ application: MentorshipApplication }>(
    `/mentors/${encodeURIComponent(username)}/programs/${encodeURIComponent(slug)}/apply`,
    { method: "POST", json: input },
  );
}

export function approveMentorshipApplication(id: string, mentorNote?: string) {
  return apiRequest<{ application: MentorshipApplication }>(
    `/mentors/applications/${encodeURIComponent(id)}/approve`,
    { method: "POST", json: { mentorNote: mentorNote ?? "" } },
  );
}

export function declineMentorshipApplication(id: string, mentorNote?: string) {
  return apiRequest<{ application: MentorshipApplication }>(
    `/mentors/applications/${encodeURIComponent(id)}/decline`,
    { method: "POST", json: { mentorNote: mentorNote ?? "" } },
  );
}

export function completeMentorshipApplication(id: string) {
  return apiRequest<{ application: MentorshipApplication }>(
    `/mentors/applications/${encodeURIComponent(id)}/complete`,
    { method: "POST" },
  );
}

export function withdrawMentorshipApplication(id: string) {
  return apiRequest<{ application: MentorshipApplication }>(
    `/mentors/applications/${encodeURIComponent(id)}/withdraw`,
    { method: "POST" },
  );
}

export function mentorPath(username: string) {
  return `/mentors/${encodeURIComponent(username)}`;
}
