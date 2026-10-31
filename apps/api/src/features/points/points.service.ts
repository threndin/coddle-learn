import { listUserPointEventsSince } from "./points.repository.js";

const GRAPH_DAYS = 52 * 7;

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

function utcDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function getPointActivity(userId: string): Promise<PointActivity> {
  const now = new Date();
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const since = new Date(end - GRAPH_DAYS * 86400 * 1000);
  const events = await listUserPointEventsSince(userId, since);

  const byDay = new Map<string, number>();
  for (const event of events) {
    const key = utcDayKey(event.createdAt);
    byDay.set(key, (byDay.get(key) ?? 0) + event.amount);
  }

  const days = [...byDay.entries()]
    .map(([date, points]) => ({ date, points }))
    .filter((day) => day.points !== 0)
    .sort((left, right) => left.date.localeCompare(right.date));

  let total = 0;
  let activeDays = 0;
  let busiest = 0;
  for (const day of days) {
    total += day.points;
    if (day.points > 0) {
      activeDays += 1;
      if (day.points > busiest) busiest = day.points;
    }
  }

  return { days, total, activeDays, busiest };
}
