import { useState } from "react";
import { payFee } from "../../api";
import { openPaymentApp } from "../../lib/appLinks";
import { colors } from "../../theme";
import { ApprovalShell } from "./ApprovalShell";

type Data = {
  feeCategory?: string;
  amountDue?: number;
  dueLines?: string[];
  payAllRemaining?: boolean;
  requireApproval?: boolean;
};

type Phase = "awaiting" | "running" | "done" | "error" | "cancelled";

export function FeeSessionBlock({
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
  const [result, setResult] = useState<string | null>(null);

  const amount =
    data.amountDue ??
    (() => {
      const m = data.dueLines?.[0]?.match(/₹([\d,]+)/);
      return m ? Number(m[1].replace(/,/g, "")) : 1;
    })();

  const dueSummary =
    data.dueLines?.join("\n") ||
    (data.amountDue != null
      ? `₹${data.amountDue.toLocaleString("en-IN")}`
      : "Outstanding fees");

  async function run() {
    setPhase("running");
    setError(null);
    try {
      const opened = await openPaymentApp({
        amountInr: amount,
        note: `${data.feeCategory || "LPU"} fee payment`,
      });

      const res = await payFee(token, {
        feeType: data.feeCategory,
        payAll: data.payAllRemaining !== false,
      });

      let msg: string;
      if (res.feeLabel && res.amountInr != null) {
        msg = `${res.feeLabel} · ₹${res.amountInr.toLocaleString("en-IN")}${res.txnId ? ` · ${res.txnId}` : ""}`;
      } else if (res.paid != null) {
        msg = `Payment recorded for ${res.paid} invoice${res.paid === 1 ? "" : "s"}`;
      } else {
        msg = "Payment recorded in Mock UMS";
      }

      if (!opened) {
        msg += " · Install GPay/PhonePe for UPI checkout";
      }
      setResult(msg);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
      setPhase("error");
    }
  }

  return (
    <ApprovalShell
      badge="Fees"
      title={`Confirm payment of ₹${amount.toLocaleString("en-IN")}`}
      subtitle="This will open your payment app (GPay, PhonePe, Paytm) and record the payment in Mock UMS."
      details={[
        { label: "Category", value: data.feeCategory || "all dues" },
        { label: "Outstanding", value: dueSummary },
        {
          label: "Scope",
          value:
            data.payAllRemaining !== false ? "Pay all remaining" : "Pay next due",
        },
      ]}
      phase={phase}
      error={error}
      doneTitle="Payment complete"
      doneSubtitle={result || "Payment recorded in Mock UMS"}
      allowLabel="Open payment app"
      onAllow={() => void run()}
      onSkip={() => setPhase("cancelled")}
      onRetry={() => void run()}
      accent={colors.orange}
    />
  );
}
