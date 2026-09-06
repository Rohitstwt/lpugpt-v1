import { useState } from "react";
import { applyLeave } from "../../api";
import { API_URL } from "../../config";
import { absoluteApiUrl, openInBrowser } from "../../lib/appLinks";
import { ApprovalShell } from "./ApprovalShell";

type Data = {
  url?: string;
  leaveType?: string;
  leaveTypeLabel?: string;
  fromDate?: string;
  toDate?: string;
  dateLabel?: string;
  reason?: string;
  requireApproval?: boolean;
};

type Phase = "awaiting" | "running" | "done" | "error" | "cancelled";

export function LeaveSessionBlock({
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
      const res = await applyLeave(token, {
        leaveType: data.leaveType || "casual",
        fromDate: data.fromDate || new Date().toISOString(),
        toDate: data.toDate || new Date().toISOString(),
        reason: data.reason || "Leave requested via LPUGPT",
      });
      setResult({ label: res.label, status: res.status });
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Application failed");
      setPhase("error");
    }
  }

  return (
    <ApprovalShell
      badge="Leave"
      title={`Confirm leave application: ${data.leaveTypeLabel || "leave"}`}
      subtitle={
        data.dateLabel ||
        "This will open the Mock UMS leave portal in your browser and submit your application."
      }
      details={[
        { label: "Type", value: data.leaveTypeLabel || data.leaveType || "—" },
        { label: "Dates", value: data.dateLabel || "—" },
        { label: "Reason", value: data.reason || "—" },
      ]}
      phase={phase}
      error={error}
      doneTitle="Leave application submitted"
      doneSubtitle={
        result
          ? `${result.label} · ${result.status}`
          : "Awaiting approval in Mock UMS"
      }
      allowLabel="Open portal and apply"
      onAllow={() => void run()}
      onSkip={() => setPhase("cancelled")}
      onRetry={() => void run()}
      accent="#a855f7"
    />
  );
}
