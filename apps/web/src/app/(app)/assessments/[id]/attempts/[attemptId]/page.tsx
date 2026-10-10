import { AssessmentAttemptView } from "@/components/assessments/assessment-attempt";
import { loadAssessmentAttempt } from "@/lib/assessments-server";

export default async function AssessmentAttemptPage({
  params,
}: {
  params: Promise<{ id: string; attemptId: string }>;
}) {
  const { id, attemptId } = await params;
  const data = await loadAssessmentAttempt(id, attemptId);
  return (
    <AssessmentAttemptView
      assessmentId={id}
      initialAssessment={data?.assessment ?? null}
      initialAttempt={data?.attempt ?? null}
    />
  );
}
