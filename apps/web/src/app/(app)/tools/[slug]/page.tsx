import { notFound } from "next/navigation";
import { ToolDetailView } from "@/components/tools/tool-detail";
import { loadTool } from "@/lib/tools-server";

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = await loadTool(slug);
  if (!tool) notFound();
  return <ToolDetailView initial={tool} />;
}
