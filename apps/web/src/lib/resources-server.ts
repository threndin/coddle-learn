import { cookies } from "next/headers";
import { resourceQueryString, type ResourceCatalog, type ResourceFilters } from "@/lib/resources";

const apiUrl = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");

async function apiFetch(path: string) {
  const jar = await cookies();
  const cookieHeader = jar
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  return fetch(`${apiUrl}${path}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    cache: "no-store",
  });
}

export async function loadResourceCatalog(
  filters: ResourceFilters,
): Promise<ResourceCatalog | null> {
  try {
    const query = resourceQueryString(filters);
    const res = await apiFetch(`/resources${query ? `?${query}` : ""}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { data: ResourceCatalog };
    return body.data;
  } catch {
    return null;
  }
}
