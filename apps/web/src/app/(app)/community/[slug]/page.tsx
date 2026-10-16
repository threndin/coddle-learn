import { notFound } from "next/navigation";
import { CommunityPostDetailView } from "@/components/community/community-post-detail";
import { loadCommunityPost } from "@/lib/community-server";

export default async function CommunityPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await loadCommunityPost(slug);
  if (!detail) notFound();

  return (
    <CommunityPostDetailView
      initialPost={detail.post}
      initialComments={detail.comments}
    />
  );
}
