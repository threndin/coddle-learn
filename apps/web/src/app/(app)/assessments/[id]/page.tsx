import { AssessmentDetailView } from "@/components/assessments/assessment-detail";
import { loadAssessmentDetail } from "@/lib/assessments-server";

export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const assessment = await loadAssessmentDetail(id);
  return <AssessmentDetailView initialAssessment={assessment} />;
}
