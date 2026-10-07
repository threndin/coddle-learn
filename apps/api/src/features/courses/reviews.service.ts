import { COURSE_LIMITS, isReviewSort, type ReviewSort } from "@coddle/shared";
import { AppError } from "../../shared/errors.js";
import { loadVisibleCourse } from "./courses.service.js";
import {
  completedUserIds,
  deleteReview,
  findReview,
  listReviews,
  ratingDistribution,
  ratingSummaries,
  summaryFor,
  upsertReview,
  type ReviewWithUser,
} from "./reviews.repository.js";

const PAGE_SIZE = 10;

type Eligibility =
  | { canReview: true; reason: null }
  | { canReview: false; reason: "creator" | "not_enrolled" | "not_published" };

function eligibility(
  course: { status: string; createdByUserId: string },
  userId: string,
  enrolled: boolean,
): Eligibility {
  if (course.createdByUserId === userId) return { canReview: false, reason: "creator" };
  if (course.status !== "published" && course.status !== "archived") {
    return { canReview: false, reason: "not_published" };
  }
  if (!enrolled) return { canReview: false, reason: "not_enrolled" };
  return { canReview: true, reason: null };
}

function reviewPayload(review: ReviewWithUser, userId: string, completed: Set<string>) {
  return {
    id: review.id,
    rating: review.rating,
    body: review.body,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
    edited: review.updatedAt.getTime() - review.createdAt.getTime() > 60_000,
    author: {
      id: review.user.id,
      name: review.user.name,
      avatarUrl: review.user.avatarUrl,
    },
    completedCourse: completed.has(review.userId),
    isMine: review.userId === userId,
  };
}

async function summaryPayload(courseId: string) {
  const [summaries, distribution] = await Promise.all([
    ratingSummaries([courseId]),
    ratingDistribution(courseId),
  ]);
  return { ...summaryFor(summaries, courseId), distribution };
}

export async function getCourseReviews(
  userId: string,
  slug: string,
  query: { sort?: unknown; page?: unknown },
) {
  const { course, enrollment } = await loadVisibleCourse(userId, slug);
  const sort: ReviewSort = isReviewSort(query.sort) ? query.sort : "recent";
  const page = Math.max(1, Math.min(500, Number.parseInt(String(query.page ?? "1"), 10) || 1));

  const [summary, rows, mine] = await Promise.all([
    summaryPayload(course.id),
    listReviews({
      courseId: course.id,
      sort,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE + 1,
    }),
    findReview(course.id, userId),
  ]);
  const pageRows = rows.slice(0, PAGE_SIZE);
  const completed = await completedUserIds(
    course.id,
    Array.from(new Set([...pageRows.map((row) => row.userId), userId])),
  );

  return {
    summary,
    reviews: pageRows.map((row) => reviewPayload(row, userId, completed)),
    myReview: mine ? reviewPayload(mine, userId, completed) : null,
    eligibility: eligibility(course, userId, Boolean(enrollment)),
    page,
    hasMore: rows.length > PAGE_SIZE,
    sort,
  };
}

export async function saveCourseReview(userId: string, slug: string, input: unknown) {
  const { course, enrollment } = await loadVisibleCourse(userId, slug);
  const allowed = eligibility(course, userId, Boolean(enrollment));
  if (!allowed.canReview) {
    const message =
      allowed.reason === "creator"
        ? "You cannot review your own course."
        : allowed.reason === "not_enrolled"
          ? "Start the course before leaving a review."
          : "This course is not open for reviews yet.";
    throw new AppError(403, "review_not_allowed", message);
  }

  const body = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new AppError(400, "invalid_field", "Pick a rating from 1 to 5 stars.", {
      field: "rating",
    });
  }
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (text.length > COURSE_LIMITS.reviewBodyMax) {
    throw new AppError(
      400,
      "invalid_field",
      `Reviews must be ${COURSE_LIMITS.reviewBodyMax.toLocaleString()} characters or fewer.`,
      { field: "body" },
    );
  }

  const saved = await upsertReview({ courseId: course.id, userId, rating, body: text });
  const completed = await completedUserIds(course.id, [userId]);
  return {
    review: reviewPayload(saved, userId, completed),
    summary: await summaryPayload(course.id),
  };
}

export async function removeCourseReview(userId: string, slug: string) {
  const { course } = await loadVisibleCourse(userId, slug);
  await deleteReview(course.id, userId);
  return { summary: await summaryPayload(course.id) };
}
