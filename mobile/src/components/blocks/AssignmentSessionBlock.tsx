import { useState } from "react";
import { submitAssignment } from "../../api";
import { API_URL } from "../../config";
import { absoluteApiUrl, openInBrowser } from "../../lib/appLinks";
import { ApprovalShell } from "./ApprovalShell";

type Data = {
  url?: string;
  courseCode?: string;
  assignmentTitle?: string;
  dueLabel?: string;
  fileName?: string;
  requireApproval?: boolean;
};

type Phase = "awaiting" | "running" | "done" | "error" | "cancelled";

export function AssignmentSessionBlock({
  data,
  token,
}: {
  data: Data;
  token: string;
}) {
  const [phase, setPhase] = useState<Phase>(
    data.requireApproval === false ? "running" : "awaiting"
  );
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ label: string; status: string } | null>(
    null
  );

  async function run() {
    setPhase("running");
    setError(null);
    try {
      if (data.url) {
        await openInBrowser(absoluteApiUrl(data.url, API_URL));
      }
      const res = await submitAssignment(token, {
        courseCode: data.courseCode || "CSE301",
        fileName: data.fileName,
      });
      setResult({ label: res.label, status: res.status });
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
      setPhase("error");
    }
  }

  return (
    <ApprovalShell
      badge="Assignment"
      title={`Confirm submission for ${data.courseCode}`}
      subtitle={`${data.assignmentTitle}. ${data.dueLabel}. This will open the Mock UMS portal and submit your assignment.`}
      details={[
        { label: "Course", value: data.courseCode || "—" },
        { label: "Assignment", value: data.assignmentTitle || "—" },
        { label: "Due", value: data.dueLabel || "—" },
        { label: "File", value: data.fileName || "assignment-demo.pdf" },
      ]}
      phase={phase}
      error={error}
      doneTitle="Assignment submitted"
      doneSubtitle={
        result
          ? `${result.label} · ${result.status}`
          : "Successfully uploaded to Mock UMS"
      }
      allowLabel="Open portal and submit"
      onAllow={() => void run()}
      onSkip={() => setPhase("cancelled")}
      onRetry={() => void run()}
      accent="#3b82f6"
    />
  );
}
