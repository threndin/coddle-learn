import { notFound } from "next/navigation";
import { CommunityPostReactionsView } from "@/components/community/community-post-reactions";
import { loadCommunityPostReactions } from "@/lib/community-server";

export default async function CommunityPostReactionsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await loadCommunityPostReactions(slug);
  if (!data) notFound();

  return <CommunityPostReactionsView data={data} />;
}
