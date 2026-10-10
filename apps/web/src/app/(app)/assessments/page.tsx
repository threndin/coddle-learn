import { AssessmentsCatalog } from "@/components/assessments/assessments-catalog";
import { loadAssessmentCatalog } from "@/lib/assessments-server";

export default async function AssessmentsPage() {
  const assessments = await loadAssessmentCatalog();
  return <AssessmentsCatalog initialAssessments={assessments} />;
}
