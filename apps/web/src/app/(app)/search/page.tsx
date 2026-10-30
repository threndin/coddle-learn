import { GlobalSearch } from "@/components/search/global-search";
import { loadSearch } from "@/lib/search-server";
import { searchFiltersFrom } from "@/lib/search";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = searchFiltersFrom(await searchParams);
  const initialResult = await loadSearch(filters);
  return <GlobalSearch initialFilters={filters} initialResult={initialResult} />;
}
