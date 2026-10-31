import { apiRequest } from "@/lib/api-client";

export type PointActivityDay = {
  date: string;
  points: number;
};

export type PointActivity = {
  days: PointActivityDay[];
  total: number;
  activeDays: number;
  busiest: number;
};

export function fetchPointActivity(signal?: AbortSignal) {
  return apiRequest<PointActivity>("/points/activity", { signal });
}
