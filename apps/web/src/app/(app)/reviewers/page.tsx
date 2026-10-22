import { ReviewersQueue } from "@/components/reviewers/reviewers-queue";
import { reviewFiltersFrom } from "@/lib/reviewers";
import { loadReviewQueue } from "@/lib/reviewers-server";

type Query = Record<string, string | string[] | undefined>;

export default async function ReviewersPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const filters = reviewFiltersFrom(await searchParams);
  const queue = await loadReviewQueue(filters);
  return <ReviewersQueue initialFilters={filters} initialQueue={queue} />;
}
